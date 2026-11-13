'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const js=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','public','styles.css'),'utf8');
const impressao=js.split('function printOrder(o)')[1].split("window.addEventListener('afterprint'")[0];
const cssDinamico=js.split('function garantirEstiloImpressaoV40()')[1].split('function printOrder(o)')[0];

test('uma folha A4 com duas vias e linha de recorte mesmo com CSS em cache',()=>{
 assert.ok(impressao.includes('print-sheet'));
 assert.ok(impressao.includes('print-cut-line'));
 assert.ok(impressao.includes("one('VIA DA OFICINA')"));
 assert.ok(impressao.includes("one('VIA DO CLIENTE')"));
 assert.ok(impressao.includes('garantirEstiloImpressaoV40()'));
 assert.ok(cssDinamico.includes('@page { size: A4 portrait; margin: 13mm; }'));
 assert.ok(cssDinamico.includes('height:270mm!important'));
 assert.ok(cssDinamico.includes('flex:0 0 135mm!important'));
 assert.ok(cssDinamico.includes('top:135mm!important'));
 assert.ok(cssDinamico.includes('document.head.appendChild(estilo)'));
 assert.ok(css.includes('@page {size:A4 portrait;margin:13mm}'));
});

test('ambas as vias mantêm cliente, instrumento, serviços, pagamento, garantia e assinaturas',()=>{
 for(const name of ['Cliente e prazos','Instrumento','Serviços e orçamento','Condições e observações','Assinatura do cliente','Responsável pela oficina','money(orderTotal(o))','money(o.paid)']) {
  assert.ok(impressao.includes(name),`Ausente da impressão: ${name}`);
 }
 assert.ok(impressao.includes("line('Garantia'"));
 assert.ok(impressao.includes('LOGO_MARK'));
});

test('impressão compacta mantém o total de todos os serviços e resume os excedentes',()=>{
 assert.ok(impressao.includes('maxPrintItems=5'));
 assert.ok(impressao.includes('serviço(s) detalhado(s) na O.S. digital'));
 assert.ok(impressao.includes('Valor total abaixo inclui todos'));
 assert.ok(impressao.includes('orderTotal(o)'));
 assert.ok(cssDinamico.includes('.print-sheet.print-dense'));
});
