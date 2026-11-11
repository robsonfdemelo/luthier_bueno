'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const {DatabaseSync} = require('node:sqlite');
const {validarEstado, validarStatus, ErroValidacao} = require('./validacao');

const TERMOS_PADRAO = 'O orçamento e a execução dos serviços dependem de aprovação do cliente. Alterações no valor ou no prazo serão comunicadas previamente.';
const TIPOS_IMAGEM = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FOTO_BYTES = 2 * 1024 * 1024;
const MAX_FOTOS_BACKUP = 5000;

function verificarImagem(mime, buffer) {
  if (!TIPOS_IMAGEM.has(mime)) throw new ErroValidacao('Foto inválida: envie JPG, PNG ou WebP.');
  if (!buffer.length || buffer.length > MAX_FOTO_BYTES) throw new ErroValidacao('Cada foto precisa ter no máximo 2 MB.');
  const jpg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  const webp = buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (!(mime === 'image/jpeg' && jpg || mime === 'image/png' && png || mime === 'image/webp' && webp)) {
    throw new ErroValidacao('O conteúdo do arquivo não corresponde a uma imagem válida.');
  }
}
function lerBase64(base64, mime) {
  if (typeof base64 !== 'string' || !base64.length || base64.length > Math.ceil(MAX_FOTO_BYTES / 3) * 4 + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new ErroValidacao('Dados da imagem inválidos ou grandes demais.');
  }
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.toString('base64') !== base64) throw new ErroValidacao('Codificação da foto inválida.');
  verificarImagem(mime, buffer);
  return buffer;
}

function criarBanco(arquivo) {
  fs.mkdirSync(path.dirname(arquivo), {recursive: true});
  const db = new DatabaseSync(arquivo);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY, nome TEXT NOT NULL, telefone TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '', documento TEXT NOT NULL DEFAULT '', observacoes TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS instrumentos (
      id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL REFERENCES clientes(id), tipo TEXT NOT NULL,
      marca TEXT NOT NULL DEFAULT '', modelo TEXT NOT NULL DEFAULT '', serie TEXT NOT NULL DEFAULT '',
      cor TEXT NOT NULL DEFAULT '', condicao TEXT NOT NULL DEFAULT '', observacoes TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS ordens_servico (
      id TEXT PRIMARY KEY, numero TEXT NOT NULL UNIQUE,
      criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL,
      cliente_id TEXT NOT NULL REFERENCES clientes(id),
      instrumento_id TEXT NOT NULL REFERENCES instrumentos(id),
      recebido_em TEXT NOT NULL, previsao_entrega TEXT NOT NULL DEFAULT '',
      solicitacao TEXT NOT NULL, diagnostico TEXT NOT NULL DEFAULT '',
      condicao_entrada TEXT NOT NULL DEFAULT '', acessorios TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL, aprovacao TEXT NOT NULL, desconto REAL NOT NULL DEFAULT 0,
      valor_recebido REAL NOT NULL DEFAULT 0, forma_pagamento TEXT NOT NULL DEFAULT 'Não informado',
      garantia_dias INTEGER NOT NULL DEFAULT 0, observacoes TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS servicos_os (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ordem_id TEXT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
      posicao INTEGER NOT NULL, descricao TEXT NOT NULL, quantidade REAL NOT NULL, preco_unitario REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS fotos_os (
      id TEXT PRIMARY KEY,
      ordem_id TEXT REFERENCES ordens_servico(id) ON DELETE SET NULL,
      nome TEXT NOT NULL, mime TEXT NOT NULL, imagem BLOB NOT NULL, criado_em TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY CHECK (id = 1), nome TEXT NOT NULL,
      telefone TEXT NOT NULL DEFAULT '', endereco TEXT NOT NULL DEFAULT '',
      documento TEXT NOT NULL DEFAULT '', termos TEXT NOT NULL DEFAULT '', garantia INTEGER NOT NULL DEFAULT 90
    );
    CREATE INDEX IF NOT EXISTS idx_instrumentos_cliente ON instrumentos(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_ordens_cliente ON ordens_servico(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_ordens_instrumento ON ordens_servico(instrumento_id);
    CREATE INDEX IF NOT EXISTS idx_servicos_ordem ON servicos_os(ordem_id, posicao);
    CREATE INDEX IF NOT EXISTS idx_fotos_ordem ON fotos_os(ordem_id);
    INSERT OR IGNORE INTO metadata (chave, valor) VALUES ('revision', '0'), ('seq', '0');
    INSERT OR IGNORE INTO configuracoes (id, nome, termos, garantia)
      VALUES (1, 'Bueno Luthier', '${TERMOS_PADRAO.replaceAll("'", "''")}', 90);
  `);

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

  function subirFoto({name, mime, data}) {
    const nome = String(name ?? 'Foto do instrumento').trim().slice(0, 150) || 'Foto do instrumento';
    const bytes = lerBase64(data, mime);
    const id = randomUUID();
    insFoto.run(id, nome, mime, bytes, new Date().toISOString());
    return {id, name:nome, mime};
  }
  function obterFoto(id) {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(String(id))) return null;
    return getFoto.get(id) || null;
  }
  function exportarBackup() {
    const {state} = recuperar();
    return {
      ...state,
      photos: getFotosBackup.all().map(f => ({id:f.id,name:f.name,mime:f.mime,data:Buffer.from(f.bytes).toString('base64')})),
      exportedAt: new Date().toISOString(),
    };
  }

  function salvar(corpo, fotosBackup = null) {
    const {revision, state} = validarEstado(corpo);
    let fotosValidas = null;
    if (fotosBackup !== null) {
      if (!Array.isArray(fotosBackup) || fotosBackup.length > MAX_FOTOS_BACKUP) {
        throw new ErroValidacao('O backup possui fotos demais.');
      }
      const vistos = new Set();
      fotosValidas = fotosBackup.map(f => {
        if (!f || typeof f !== 'object' || !/^[a-zA-Z0-9_-]{1,80}$/.test(f.id || '') || vistos.has(f.id)) {
          throw new ErroValidacao('ID de foto duplicado ou inválido no backup.');
        }
        vistos.add(f.id);
        const name = String(f.name ?? 'Foto do instrumento').trim().slice(0, 150);
        return {id:f.id, name, mime:f.mime, bytes:lerBase64(f.data, f.mime)};
      });
      const referencias = state.orders.flatMap(o => o.photos.map(p => p.id));
      if (referencias.some(id => !vistos.has(id))) throw new ErroValidacao('Backup sem os arquivos de algumas fotos da OS.');
    }
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
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(id)) {
      throw new ErroValidacao('Identificador da O.S. inválido.');
    }
    if (!Number.isSafeInteger(revision) || revision < 0 || revision > 1000000000) {
      throw new ErroValidacao('Revisão inválida.');
    }
    const novoStatus = validarStatus(status);
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

  return {recuperar, salvar, alterarStatus, subirFoto, obterFoto, exportarBackup, restaurar: (corpo) => salvar(corpo, corpo.photos || []), fechar: () => db.close()};
}

module.exports = {criarBanco, MAX_FOTO_BYTES};
