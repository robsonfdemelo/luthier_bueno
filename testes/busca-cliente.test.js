'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../public/styles.css'),'utf8');
const funcoes=app.slice(app.indexOf('function normalizarBuscaCliente('),app.indexOf('function modalHtml(){'));
function contexto(){
  const pessoas=[
    {id:'c1',name:'João das Flores',phone:'(62) 99876-1234'},
    {id:'c2',name:'Maria Santos',phone:'(62) 98888-1111'},
    {id:'c3',name:'Joana Pereira',phone:'(11) 97777-2222'}
  ];
  const context={data:{customers:pessoas},cust:id=>pessoas.find(c=>c.id===id),h:value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),icon:()=>'<svg></svg>',ui:{customerOptionIndex:-1}};
  vm.runInNewContext(funcoes,context);
  return context;
}
test('busca de clientes ignora acentos e diferenças entre maiúsculas e minúsculas',()=>{
  const c=contexto();
  assert.equal(vm.runInNewContext("clientesCorrespondentes('JOA').map(c=>c.id).join(',')",c),'c3,c1');
  assert.equal(vm.runInNewContext("clientesCorrespondentes('maria').map(c=>c.id).join(',')",c),'c2');
});
test('busca por telefone aceita números sem máscara e parte do contato',()=>{
  const c=contexto();
  assert.equal(vm.runInNewContext("clientesCorrespondentes('998761234').map(c=>c.id).join(',')",c),'c1');
  assert.equal(vm.runInNewContext("clientesCorrespondentes('98888').map(c=>c.id).join(',')",c),'c2');
});
test('campo de O.S. mantém o ID, preenche edição e oferece cadastro rápido',()=>{
  const c=contexto();
  const html=vm.runInNewContext("campoBuscaCliente('c2')",c);
  assert.match(html,/name="customerId" value="c2"/);
  assert.match(html,/value="Maria Santos"/);
  assert.match(html,/role="combobox"/);
  assert.match(html,/data-new-customer-order/);
  assert.doesNotMatch(html,/<select/);
  assert.match(app,/if\(!cust\(o.customerId\)\)/);
});
test('seleção por teclado e rascunho são tratados pelo frontend',()=>{
  assert.match(app,/e.key==='ArrowDown'/);
  assert.match(app,/e.key==='ArrowUp'/);
  assert.match(app,/e.key==='Enter'/);
  assert.match(app,/function guardarRascunhoOrdem/);
  assert.match(app,/if\(ui.orderDraft\)restaurarRascunhoOrdem\(record.id\)/);
  assert.match(css,/\.customer-search-options\[hidden\]/);
});
