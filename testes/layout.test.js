'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','public','styles.css'),'utf8');
const painel=app.split('function dashboard(){')[1].split('function empty(')[0];
const cabecalho=app.split('function shell(){')[1].split('function pageHtml(){')[0];
test('novo dashboard usa dados reais sem números de exemplo',()=>{
  assert.ok(painel.includes('data.orders.filter('));
  assert.ok(painel.includes('orderTotal(o)'));
  assert.ok(painel.includes('statusRapido(o)'));
  assert.ok(painel.includes('receivedDate'));
  assert.ok(painel.includes('money(received)'));
  assert.ok(!painel.includes('João Oliveira'));
  assert.ok(!painel.includes('Prévia de design'));
  assert.ok(!painel.includes('Comece por aqui'));
});
test('dashboard mantém cadastro, nova OS, pesquisa, filtro e prioridades',()=>{
  for(const trecho of ['data-open="customer"','data-open="order"'])assert.ok(cabecalho.includes(trecho));
  for(const trecho of ['id="listing-search"','id="listing-filter"','data-priority','data-page="orders"','statusRapido(o)'])assert.ok(painel.includes(trecho));
  assert.ok(app.includes("ui.filter=t.dataset.priority"));
});
test('estilos do novo painel não removem impressão e foto',()=>{
  for(const trecho of ['.dashboard-stats','.dashboard-workspace','.dashboard-priorities','.utility-strip','.sidebar','.modal','.photo-upload-box','@media print'])assert.ok(css.includes(trecho));
  assert.ok(app.includes("function printOrder(o)"));
  assert.ok(app.includes('order-photo-picker'));
});
