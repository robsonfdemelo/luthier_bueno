'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const {mkdtempSync, rmSync} = require('node:fs');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {criarBanco} = require('../server/banco');

function novaInstancia() {
  const diretorio = mkdtempSync(path.join(tmpdir(),'bueno-luthier-test-'));
  const arquivo = path.join(diretorio,'teste.sqlite');
  const banco = criarBanco(arquivo);
  return {banco, arquivo, fechar:() => {banco.fechar(); rmSync(diretorio,{recursive:true,force:true})}};
}

function estadoExemplo() {
  return {
    version:2, seq:1,
    customers:[{id:'cliente-1',name:'Ana Silva',phone:'(62) 99999-0000',email:'ana@example.com',document:'',notes:''}],
    instruments:[{id:'instrumento-1',customerId:'cliente-1',type:'Violão',brand:'Yamaha',model:'F310',serial:'ABC123',color:'Natural',condition:'Risco lateral',notes:''}],
    orders:[{
      id:'ordem-1',number:'OS-00001',createdAt:'2026-11-07T12:00:00.000Z',updatedAt:'2026-11-07T12:00:00.000Z',
      customerId:'cliente-1',instrumentId:'instrumento-1',receivedDate:'2026-11-07',dueDate:'2026-11-12',
      complaint:'Cordas altas',diagnosis:'Regular tensor',condition:'Risco lateral',accessories:'Capa',
      status:'Recebido',approval:'Pendente',items:[{description:'Regulagem completa',quantity:1,price:150}],
      paid:50,paymentMethod:'Pix',warrantyDays:90,notes:''
    }],
    settings:{name:'Bueno Luthier',phone:'',address:'',document:'',terms:'Condições de teste',warranty:90}
  };
}

test('inicia banco vazio e salva cliente, instrumento, OS e itens', () => {
  const fixture = novaInstancia();
  try {
    let resultado = fixture.banco.recuperar();
    assert.equal(resultado.revision, 0);
    assert.equal(resultado.state.customers.length, 0);
    resultado = fixture.banco.salvar({revision:0,state:estadoExemplo()});
    assert.equal(resultado.revision, 1);
    assert.equal(resultado.state.orders[0].number,'OS-00001');
    assert.equal(resultado.state.orders[0].items[0].price,150);
    assert.equal(resultado.state.settings.terms,'Condições de teste');
  } finally {fixture.fechar()}
});

test('mantém dados gravados ao reabrir o arquivo SQLite', () => {
  const fixture = novaInstancia();
  try {
    fixture.banco.salvar({revision:0,state:estadoExemplo()});
    fixture.banco.fechar();
    const novo = criarBanco(fixture.arquivo);
    assert.equal(novo.recuperar().state.instruments[0].serial,'ABC123');
    assert.equal(novo.recuperar().state.orders[0].items.length,1);
    novo.fechar();
    rmSync(path.dirname(fixture.arquivo),{recursive:true,force:true});
  } catch (erro) {rmSync(path.dirname(fixture.arquivo),{recursive:true,force:true});throw erro}
});

test('rejeita perda de atualização entre duas abas', () => {
  const fixture = novaInstancia();
  try {
    fixture.banco.salvar({revision:0,state:estadoExemplo()});
    assert.throws(()=>fixture.banco.salvar({revision:0,state:estadoExemplo()}), {status:409});
    assert.equal(fixture.banco.recuperar().revision,1);
  } finally {fixture.fechar()}
});

test('valida vínculos e mantém a transação intacta', () => {
  const fixture = novaInstancia();
  try {
    const state=estadoExemplo();
    state.instruments[0].customerId='cliente-inexistente';
    assert.throws(()=>fixture.banco.salvar({revision:0,state}),/cliente inexistente/);
    assert.equal(fixture.banco.recuperar().state.customers.length,0);
    assert.equal(fixture.banco.recuperar().revision,0);
  } finally {fixture.fechar()}
});

test('não reutiliza número de OS após restauração de backup antigo', () => {
  const fixture = novaInstancia();
  try {
    fixture.banco.salvar({revision:0,state:estadoExemplo()});
    const vazio=estadoExemplo();
    vazio.orders=[]; vazio.seq=0;
    const restaurado=fixture.banco.salvar({revision:1,state:vazio});
    assert.equal(restaurado.state.seq,1);
  } finally {fixture.fechar()}
});

test('não utiliza desconto vindo de registros ou backups antigos', () => {
  const fixture = novaInstancia();
  try {
    const state = estadoExemplo();
    state.orders[0].discount = 20; // compatibilidade com arquivos da versão anterior
    const resultado = fixture.banco.salvar({revision:0,state});
    assert.equal(Object.hasOwn(resultado.state.orders[0], 'discount'), false);
    assert.equal(resultado.state.orders[0].items[0].price,150);
    assert.equal(resultado.state.orders[0].paid,50);
  } finally {fixture.fechar()}
});

test('valor recebido maior que total dos serviços é rejeitado', () => {
  const fixture = novaInstancia();
  try {
    const state = estadoExemplo();
    state.orders[0].paid = 151;
    assert.throws(() => fixture.banco.salvar({revision:0,state}), /valor recebido excede o total/);
    assert.equal(fixture.banco.recuperar().revision,0);
  } finally {fixture.fechar()}
});
