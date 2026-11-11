'use strict';

const {abrirConexao} = require('../database/connection');
const {ErroValidacao} = require('../validators/estado.validator');

function criarRepositorio(arquivo) {
  const db = abrirConexao(arquivo);

  const queryClientes = db.prepare('SELECT id, nome AS name, telefone AS phone, email, documento AS document, observacoes AS notes FROM clientes ORDER BY rowid');
  const queryInstrumentos = db.prepare('SELECT id, cliente_id AS customerId, tipo AS type, marca AS brand, modelo AS model, serie AS serial, cor AS color, condicao AS condition, observacoes AS notes FROM instrumentos ORDER BY rowid');
  const queryOrdens = db.prepare(`SELECT id, numero AS number, criado_em AS createdAt, atualizado_em AS updatedAt,
    cliente_id AS customerId, instrumento_id AS instrumentId, recebido_em AS receivedDate,
    previsao_entrega AS dueDate, solicitacao AS complaint, diagnostico AS diagnosis,
    condicao_entrada AS condition, acessorios AS accessories, status, aprovacao AS approval,
    valor_recebido AS paid, forma_pagamento AS paymentMethod,
    garantia_dias AS warrantyDays, observacoes AS notes FROM ordens_servico ORDER BY rowid`);
  const queryItens = db.prepare('SELECT ordem_id AS orderId, descricao AS description, quantidade AS quantity, preco_unitario AS price FROM servicos_os ORDER BY ordem_id, posicao');
  const queryFotos = db.prepare('SELECT id, ordem_id AS orderId, nome AS name, mime FROM fotos_os WHERE ordem_id IS NOT NULL ORDER BY rowid');
  const queryConfigs = db.prepare('SELECT nome AS name, telefone AS phone, endereco AS address, documento AS document, termos AS terms, garantia AS warranty FROM configuracoes WHERE id = 1');
  const queryMeta = db.prepare('SELECT valor FROM metadata WHERE chave = ?');
  const getFoto = db.prepare('SELECT id, nome AS name, mime, imagem AS bytes FROM fotos_os WHERE id = ?');
  const getFotoRef = db.prepare('SELECT id FROM fotos_os WHERE id = ?');
  const getFotosBackup = db.prepare('SELECT id, nome AS name, mime, imagem AS bytes FROM fotos_os WHERE ordem_id IS NOT NULL ORDER BY rowid');
  const insFoto = db.prepare('INSERT INTO fotos_os (id,ordem_id,nome,mime,imagem,criado_em) VALUES (?,NULL,?,?,?,?)');
  const updFoto = db.prepare('UPDATE fotos_os SET ordem_id=? WHERE id=?');

  function recuperar() {
    const orders = queryOrdens.all();
    const porOrdem = new Map(orders.map(o => [o.id, o]));
    for (const o of orders) {o.items = []; o.photos = [];}
    for (const item of queryItens.all()) {
      porOrdem.get(item.orderId)?.items.push({description:item.description, quantity:item.quantity, price:item.price});
    }
    for (const foto of queryFotos.all()) {
      porOrdem.get(foto.orderId)?.photos.push({id:foto.id,name:foto.name,mime:foto.mime});
    }
    return {
      revision: Number(queryMeta.get('revision').valor),
      state: {
        version: 3, seq: Number(queryMeta.get('seq').valor),
        customers: queryClientes.all(), instruments: queryInstrumentos.all(), orders,
        settings: queryConfigs.get(),
      },
    };
  }

  const insCliente = db.prepare('INSERT INTO clientes (id,nome,telefone,email,documento,observacoes) VALUES (?,?,?,?,?,?)');
  const insInstrumento = db.prepare('INSERT INTO instrumentos (id,cliente_id,tipo,marca,modelo,serie,cor,condicao,observacoes) VALUES (?,?,?,?,?,?,?,?,?)');
  const insOrdem = db.prepare(`INSERT INTO ordens_servico (
    id,numero,criado_em,atualizado_em,cliente_id,instrumento_id,recebido_em,previsao_entrega,
    solicitacao,diagnostico,condicao_entrada,acessorios,status,aprovacao,
    valor_recebido,forma_pagamento,garantia_dias,observacoes
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insServico = db.prepare('INSERT INTO servicos_os (ordem_id,posicao,descricao,quantidade,preco_unitario) VALUES (?,?,?,?,?)');
  const updConfig = db.prepare('UPDATE configuracoes SET nome=?, telefone=?, endereco=?, documento=?, termos=?, garantia=? WHERE id=1');
  const updMeta = db.prepare('UPDATE metadata SET valor=? WHERE chave=?');
  const selStatus = db.prepare('SELECT status, atualizado_em AS updatedAt FROM ordens_servico WHERE id=?');
  const updStatus = db.prepare('UPDATE ordens_servico SET status=?, atualizado_em=? WHERE id=?');

  function subirFoto({id, name, mime, bytes}) {
    insFoto.run(id, name, mime, bytes, new Date().toISOString());
    return {id, name, mime};
  }
  function obterFoto(id) {
    return getFoto.get(id) || null;
  }
  function listarFotosBackup() {
    return getFotosBackup.all();
  }

  // Recebe um estado previamente validado pelo service.
  function salvar({revision, state}, fotosValidas = null) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const revisaoAtual = Number(queryMeta.get('revision').valor);
      if (revision !== revisaoAtual) {
        throw new ErroValidacao('Os dados mudaram em outra aba. Atualize a página antes de salvar novamente.', 409);
      }
      db.exec('UPDATE fotos_os SET ordem_id=NULL; DELETE FROM servicos_os; DELETE FROM ordens_servico; DELETE FROM instrumentos; DELETE FROM clientes;');
      if (fotosValidas) {
        db.exec('DELETE FROM fotos_os;');
        for (const foto of fotosValidas) insFoto.run(foto.id, foto.name, foto.mime, foto.bytes, new Date().toISOString());
      }
      for (const c of state.customers) insCliente.run(c.id,c.name,c.phone,c.email,c.document,c.notes);
      for (const i of state.instruments) insInstrumento.run(i.id,i.customerId,i.type,i.brand,i.model,i.serial,i.color,i.condition,i.notes);
      for (const o of state.orders) {
        insOrdem.run(o.id,o.number,o.createdAt,o.updatedAt,o.customerId,o.instrumentId,o.receivedDate,o.dueDate,o.complaint,o.diagnosis,o.condition,o.accessories,o.status,o.approval,o.paid,o.paymentMethod,o.warrantyDays,o.notes);
        o.items.forEach((it,n) => insServico.run(o.id,n,it.description,it.quantity,it.price));
        for (const photo of o.photos) {
          if (!getFotoRef.get(photo.id)) throw new ErroValidacao(`Foto da OS ${o.number} não encontrada. Tente anexar novamente.`);
          updFoto.run(o.id, photo.id);
        }
      }
      const s = state.settings;
      updConfig.run(s.name,s.phone,s.address,s.document,s.terms,s.warranty);
      const seqAnterior = Number(queryMeta.get('seq').valor);
      const maxOS = state.orders.reduce((m,o) => Math.max(m,Number(o.number.slice(3))),0);
      updMeta.run(String(Math.max(state.seq, seqAnterior, maxOS)), 'seq');
      updMeta.run(String(revisaoAtual + 1), 'revision');
      // Fotos anexadas e depois removidas permanecem por até 48h para permitir recuperação incidental.
      db.prepare("DELETE FROM fotos_os WHERE ordem_id IS NULL AND criado_em < ?").run(new Date(Date.now()-48*60*60*1000).toISOString());
      db.exec('COMMIT');
    } catch (erro) {
      db.exec('ROLLBACK');
      throw erro;
    }
    return recuperar();
  }

  function alterarStatus({id, revision, status}) {
    const novoStatus = status;
    db.exec('BEGIN IMMEDIATE');
    try {
      const revisaoAtual = Number(queryMeta.get('revision').valor);
      if (revision !== revisaoAtual) {
        throw new ErroValidacao('Esta O.S. foi alterada em outro acesso. Os dados serão atualizados; tente novamente.', 409);
      }
      const ordem = selStatus.get(id);
      if (!ordem) throw new ErroValidacao('Ordem de serviço não encontrada.', 404);
      if (ordem.status === novoStatus) {
        db.exec('COMMIT');
        return {id, status:novoStatus, updatedAt:ordem.updatedAt, revision:revisaoAtual};
      }
      const updatedAt = new Date().toISOString();
      updStatus.run(novoStatus, updatedAt, id);
      updMeta.run(String(revisaoAtual+1), 'revision');
      db.exec('COMMIT');
      return {id, status:novoStatus, updatedAt, revision:revisaoAtual+1};
    } catch (erro) {
      db.exec('ROLLBACK');
      throw erro;
    }
  }

  return {recuperar, salvar, alterarStatus, subirFoto, obterFoto, listarFotosBackup, fechar: () => db.close()};
}

module.exports = {criarRepositorio};
