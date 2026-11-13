'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','public','styles.css'),'utf8');
const impressao=app.split('function printOrder(o)')[1].split("window.addEventListener('afterprint'")[0];

test('cabeçalho da O.S. mostra Endereço e Telefone na mesma linha e CNPJ abaixo nas duas vias',()=>{
  assert.ok(impressao.includes('class="print-contact-row"'));
  assert.ok(impressao.includes('class="print-contact-document"'));
  assert.match(impressao,/<strong>Endereço:<\/strong> \$\{endereco\}/);
  assert.match(impressao,/<strong>Telefone:<\/strong> \$\{telefone\}/);
  assert.match(impressao,/<strong>CNPJ:<\/strong> \$\{cnpj\}/);
  assert.ok(impressao.includes('h(s.address||'));
  assert.ok(impressao.includes('h(s.phone||'));
  assert.ok(impressao.includes('h(s.document||'));
  assert.ok(impressao.includes("one('VIA DA OFICINA')")&&impressao.includes("one('VIA DO CLIENTE')"));
  assert.ok(app.includes('grid-template-columns:minmax(0,1fr) minmax(0,36mm)'));
  assert.ok(css.includes('.print-contact-row'));
});

test('confirmação após salvar mostra o número persistido e oferece impressão',()=>{
  assert.ok(app.includes("ui.modal='orderSaved';ui.editId=record.id;render()"));
  assert.ok(app.includes('class="order-saved-number"'));
  assert.ok(app.includes('${h(o.number)}'));
  assert.ok(app.includes('data-print="'));
});

test('configurações mantêm telefone endereço e CNPJ usados na impressão',()=>{
  assert.ok(app.includes('name="phone"'));
  assert.ok(app.includes('name="address"'));
  assert.ok(app.includes('name="document"'));
  assert.ok(!impressao.includes('Rua Exemplo'));
});
