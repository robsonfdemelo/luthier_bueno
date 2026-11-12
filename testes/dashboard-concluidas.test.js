'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
const dashboardSource=app.split('function dashboard(){')[1].split('\nfunction empty(')[0];
function renderCom(status, filter='Todos', search='') {
  const order={id:'ordem-1',number:'OS-00001',customerId:'cliente-1',instrumentId:'instrumento-1',
    createdAt:'2026-11-12T12:00:00.000Z',receivedDate:'2026-11-07',status,paid:150,items:[{quantity:1,price:150}]};
  const fake={
    data:{orders:[order]},ui:{filter,search},STATUS:['Aprovado','Em execução','Aguardando peça','Pronto para retirada','Entregue','Cancelado'],
    cust:()=>({name:'Cliente de teste',phone:''}),instr:()=>({type:'Violão',brand:'Takamine',model:'P3DC'}),
    labelInstrument:i=>i.type+' • '+i.brand+' '+i.model,
    statusRapido:o=>'<select data-status-order="'+o.id+'">'+o.status+'</select>',
    orderTotal:o=>o.items.reduce((total,i)=>total+i.quantity*i.price,0),
    icon:()=>'',date:()=> '07/11/2026',money:n=>'R$ '+Number(n).toFixed(2).replace('.',','),
    num:n=>Math.max(0,Number(n)||0),h:x=>String(x),btn:()=>'<button>Nova ordem</button>'
  };
  vm.runInNewContext('function dashboard(){'+dashboardSource+';globalThis.rendered=dashboard();',fake);
  return fake.rendered;
}
test('ordem entregue continua visível entre as últimas O.S. do painel',()=>{
  const html=renderCom('Entregue');
  assert.match(html,/Últimas ordens de serviço/);
  assert.match(html,/OS-00001/);
  assert.match(html,/Cliente de teste/);
  assert.match(html,/data-status-order="ordem-1"/);
  assert.match(html,/<div class="dashboard-stat-value">00<\/div>/);
  assert.match(html,/<option value="Entregue"/);
});
test('filtro Entregue mostra a ordem, e filtro Em execução não a mostra',()=>{
  assert.match(renderCom('Entregue','Entregue'),/OS-00001/);
  assert.doesNotMatch(renderCom('Entregue','Em execução'),/OS-00001/);
});
test('ordem em execução permanece visível e conta como ordem aberta',()=>{
  const html=renderCom('Em execução');
  assert.match(html,/OS-00001/);
  assert.match(html,/<div class="dashboard-stat-value">01<\/div>/);
});
