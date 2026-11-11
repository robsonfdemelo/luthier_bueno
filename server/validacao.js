'use strict';

class ErroValidacao extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

const STATUS = new Set(['Recebido', 'Em avaliação', 'Aguardando aprovação', 'Aprovado', 'Em execução', 'Aguardando peça', 'Pronto para retirada', 'Entregue', 'Cancelado']);
const APROVACOES = new Set(['Pendente', 'Aprovado', 'Recusado']);
const TIPOS = new Set(['Violão', 'Guitarra', 'Baixo', 'Cavaquinho', 'Ukulele', 'Viola', 'Outro']);
const PAGAMENTOS = new Set(['Não informado', 'Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Outro']);

function objeto(valor, nome) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new ErroValidacao(`${nome} precisa ser um objeto.`);
  }
  return valor;
}

function lista(valor, nome, max = 20000) {
  if (!Array.isArray(valor) || valor.length > max) {
    throw new ErroValidacao(`${nome} deve ser uma lista válida (até ${max} registros).`);
  }
  return valor;
}

function texto(valor, nome, max = 1000, obrigatorio = false) {
  const v = String(valor ?? '').trim();
  if (v.length > max || (obrigatorio && !v)) {
    throw new ErroValidacao(`${nome} inválido (limite de ${max} caracteres).`);
  }
  return v;
}

function numero(valor, nome, max = 100000000) {
  const n = Number(valor ?? 0);
  if (!Number.isFinite(n) || n < 0 || n > max) {
    throw new ErroValidacao(`${nome} deve ser um número não negativo até ${max}.`);
  }
  return n;
}

function inteiro(valor, nome, max = 100000000) {
  const n = numero(valor, nome, max);
  if (!Number.isSafeInteger(n)) throw new ErroValidacao(`${nome} precisa ser inteiro.`);
  return n;
}

function opcao(valor, nome, permitidos) {
  const v = texto(valor, nome, 90, true);
  if (!permitidos.has(v)) throw new ErroValidacao(`${nome} não reconhecido: ${v}.`);
  return v;
}

function dataISO(valor, nome, obrigatorio = false) {
  const v = texto(valor, nome, 10, obrigatorio);
  if (!v) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T12:00:00Z`)) || new Date(`${v}T12:00:00Z`).toISOString().slice(0,10) !== v) {
    throw new ErroValidacao(`${nome} deve ter formato AAAA-MM-DD.`);
  }
  return v;
}

function unicidade(itens, campo, nome) {
  const valores = new Set();
  for (const item of itens) {
    if (valores.has(item[campo])) throw new ErroValidacao(`${nome}: ${campo} duplicado (${item[campo]}).`);
    valores.add(item[campo]);
  }
}

function validarEstado(payload) {
  objeto(payload, 'Corpo da requisição');
  const revision = inteiro(payload.revision, 'Revisão', 1000000000);
  const state = objeto(payload.state, 'state');
  const clientes = lista(state.customers, 'Clientes').map((c, idx) => {
    objeto(c, `Cliente ${idx+1}`);
    return {
      id: texto(c.id, 'ID do cliente', 80, true),
      name: texto(c.name, 'Nome do cliente', 120, true),
      phone: texto(c.phone, 'Telefone', 30, true),
      email: texto(c.email, 'E-mail', 180),
      document: texto(c.document, 'CPF/CNPJ', 30),
      notes: texto(c.notes, 'Observações do cliente', 5000),
    };
  });
  unicidade(clientes, 'id', 'Clientes');
  const clienteIds = new Set(clientes.map(c => c.id));

  const instrumentos = lista(state.instruments, 'Instrumentos').map((i, idx) => {
    objeto(i, `Instrumento ${idx+1}`);
    const instrumento = {
      id: texto(i.id, 'ID do instrumento', 80, true),
      customerId: texto(i.customerId, 'Proprietário', 80, true),
      type: opcao(i.type, 'Tipo de instrumento', TIPOS),
      brand: texto(i.brand, 'Marca', 160),
      model: texto(i.model, 'Modelo', 160),
      serial: texto(i.serial, 'Número de série', 120),
      color: texto(i.color, 'Cor', 120),
      condition: texto(i.condition, 'Condição', 5000),
      notes: texto(i.notes, 'Observações do instrumento', 5000),
    };
    if (!clienteIds.has(instrumento.customerId)) throw new ErroValidacao(`Instrumento ${instrumento.id}: cliente inexistente.`);
    return instrumento;
  });
  unicidade(instrumentos, 'id', 'Instrumentos');
  const instrumentoPorId = new Map(instrumentos.map(i => [i.id, i]));

  const ordens = lista(state.orders, 'Ordens de serviço').map((o, idx) => {
    objeto(o, `OS ${idx+1}`);
    const itens = lista(o.items, `Serviços da OS ${idx+1}`, 300).map((it, n) => {
      objeto(it, `Serviço ${n+1}`);
      return {
        description: texto(it.description, 'Descrição do serviço', 180, true),
        quantity: numero(it.quantity, 'Quantidade', 1000000),
        price: numero(it.price, 'Preço', 100000000),
      };
    });
    for (const it of itens) if (it.quantity <= 0) throw new ErroValidacao('A quantidade de um serviço precisa ser maior que zero.');
    const fotos = lista(o.photos ?? [], `Fotos da OS ${idx+1}`, 6).map((foto, n) => {
      objeto(foto, `Foto ${n+1}`);
      const id = texto(foto.id, 'Identificador da foto', 80, true);
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new ErroValidacao('ID de foto inválido.');
      return {id};
    });
    unicidade(fotos, 'id', `Fotos da OS ${idx+1}`);
    const ordem = {
      id: texto(o.id, 'ID da OS', 80, true),
      number: texto(o.number, 'Número da OS', 32, true),
      createdAt: texto(o.createdAt, 'Data de criação', 50, true),
      updatedAt: texto(o.updatedAt, 'Data de alteração', 50, true),
      customerId: texto(o.customerId, 'Cliente da OS', 80, true),
      instrumentId: texto(o.instrumentId, 'Instrumento da OS', 80, true),
      receivedDate: dataISO(o.receivedDate, 'Data de entrada', true),
      dueDate: dataISO(o.dueDate, 'Previsão de entrega'),
      complaint: texto(o.complaint, 'Solicitação', 10000),
      diagnosis: texto(o.diagnosis, 'Diagnóstico', 10000),
      condition: texto(o.condition, 'Condição na entrada', 10000),
      accessories: texto(o.accessories, 'Acessórios', 4000),
      status: opcao(o.status, 'Status', STATUS),
      approval: opcao(o.approval, 'Aprovação', APROVACOES),
      items: itens,
      photos: fotos,
      paid: numero(o.paid, 'Valor recebido'),
      paymentMethod: opcao(o.paymentMethod || 'Não informado', 'Forma de pagamento', PAGAMENTOS),
      warrantyDays: inteiro(o.warrantyDays, 'Garantia', 3650),
      notes: texto(o.notes, 'Observações da OS', 10000),
    };
    if (!/^OS-\d{5,}$/.test(ordem.number)) throw new ErroValidacao(`Número de OS inválido: ${ordem.number}.`);
    if (!clienteIds.has(ordem.customerId)) throw new ErroValidacao(`OS ${ordem.number}: cliente inexistente.`);
    if (instrumentoPorId.get(ordem.instrumentId)?.customerId !== ordem.customerId) {
      throw new ErroValidacao(`OS ${ordem.number}: instrumento não pertence ao cliente informado.`);
    }
    const subtotal = itens.reduce((total, item) => total + item.quantity * item.price, 0);
    if (ordem.paid > subtotal + 0.001) {
      throw new ErroValidacao(`OS ${ordem.number}: valor recebido excede o total dos serviços.`);
    }
    if (Number.isNaN(Date.parse(ordem.createdAt)) || Number.isNaN(Date.parse(ordem.updatedAt))) {
      throw new ErroValidacao(`OS ${ordem.number}: datas de criação/alteração inválidas.`);
    }
    return ordem;
  });
  unicidade(ordens, 'id', 'Ordens de serviço');
  unicidade(ordens, 'number', 'Ordens de serviço');
  const todasFotos = new Set();
  for (const os of ordens) for (const foto of os.photos) {
    if (todasFotos.has(foto.id)) throw new ErroValidacao('Uma foto só pode pertencer a uma ordem de serviço.');
    todasFotos.add(foto.id);
  }

  const config = objeto(state.settings, 'Configurações');
  const settings = {
    name: texto(config.name, 'Nome da oficina', 140, true),
    phone: texto(config.phone, 'Telefone da oficina', 50),
    address: texto(config.address, 'Endereço', 500),
    document: texto(config.document, 'Documento da oficina', 50),
    terms: texto(config.terms, 'Condições da OS', 10000),
    warranty: inteiro(config.warranty, 'Garantia padrão', 3650),
  };
  const seq = inteiro(state.seq, 'Sequência de OS', 1000000000);
  return {revision, state: {version: 3, seq, customers: clientes, instruments: instrumentos, orders: ordens, settings}};
}

module.exports = {validarEstado, ErroValidacao};
