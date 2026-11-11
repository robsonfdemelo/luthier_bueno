'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
const orderForm=app.split("else if(type==='order'){")[1].split("else if(type==='view')")[0];
const print=app.split('function printOrder(o)')[1].split("window.addEventListener('afterprint'")[0];

test('formulário OS mantém cliente, instrumento e fotos, sem os quatro campos removidos',()=>{
 for(const name of ['instrumentSerial','instrumentColor','instrumentCondition','instrumentNotes',"'Condição na entrada / avarias'"]){
  assert.ok(!orderForm.includes(name),`campo deve ter sido removido: ${name}`);
 }
 for(const name of ['customerId','instrumentType','instrumentBrand','instrumentModel','order-photo-picker','service-list']){
  assert.ok(orderForm.includes(name),`campo necessário ausente: ${name}`);
 }
});

test('impressão e rodapé não exibem campos retirados nem detalhes técnicos',()=>{
 for(const text of ["line('Número de série'","line('Cor / acabamento'","line('Condição na entrada / avarias'"]){
  assert.ok(!print.includes(text),text);
 }
 assert.ok(!app.includes('· Versão 2.3 · SQLite'));
 assert.ok(!app.includes('Dados salvos no SQLite do servidor · Backups disponíveis'));
});

test('ao editar OS antiga, preserva atributos históricos do instrumento',()=>{
 for(const name of ['iAnterior?.serial','iAnterior?.color','iAnterior?.condition','iAnterior?.notes','old?.condition']){
  assert.ok(app.includes(name),`preservação ausente: ${name}`);
 }
});


test('status pode ser alterado diretamente no painel, listagem e detalhe',()=>{
  assert.ok(app.includes('function statusRapido(o)'));
  assert.ok(app.includes('data-status-order'));
  assert.ok(app.includes('async function alterarStatusRapido(id,novo)'));
  assert.ok(app.includes('const salvo=await save(anterior)'));
  assert.ok(app.includes("if(e.target.closest('[data-status-order]'))return"));
  assert.ok(app.split('function dashboard()')[1].split('function empty(')[0].includes('statusRapido(o)'));
  assert.ok(app.split('function ordersPage()')[1].split('function customersPage()')[0].includes('statusRapido(o)'));
  assert.ok(app.split('function viewOrder(o)')[1].split('function render()')[0].includes('statusRapido(o)'));
});

test('relato do cliente e diagnóstico não são campos obrigatórios nem aparecem nas vistas da OS',()=>{
  assert.ok(!orderForm.includes("area('Solicitação"));
  assert.ok(!orderForm.includes("area('Avaliação"));
  assert.ok(!orderForm.includes("'complaint',"));
  assert.ok(!orderForm.includes("'diagnosis',"));
  const detalhe=app.split('function viewOrder(o)')[1].split('function render()')[0];
  assert.ok(!detalhe.includes('Relato do cliente'));
  assert.ok(!detalhe.includes('Diagnóstico técnico'));
  assert.ok(!print.includes('Solicitação / defeito relatado'));
  assert.ok(!print.includes('Diagnóstico técnico'));
  assert.ok(app.includes("complaint:old?.complaint||''"));
});
