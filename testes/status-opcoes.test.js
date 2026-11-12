'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {DatabaseSync}=require('node:sqlite');
const {validarStatus,validarEstado}=require('../server/validators/estado.validator');
const {criarRepositorio}=require('../server/repositories/oficina.repository');
const {criarOficinaService}=require('../server/services/oficina.service');

const app=fs.readFileSync(path.join(__dirname,'..','public','app.js'),'utf8');
const ativos=['Aprovado','Em execução','Aguardando peça','Pronto para retirada','Entregue','Cancelado'];
const antigos=['Recebido','Em avaliação','Aguardando aprovação'];

function dados(status='Em execução'){
 const timestamp='2026-11-12T12:00:00.000Z';
 return {
  version:3,seq:1,
  customers:[{id:'c',name:'Cliente Teste',phone:'(62) 90000-0000',email:'',document:'',notes:''}],
  instruments:[{id:'i',customerId:'c',type:'Violão',brand:'Yamaha',model:'F310',serial:'',color:'',condition:'',notes:''}],
  orders:[{id:'o',number:'OS-00001',createdAt:timestamp,updatedAt:timestamp,customerId:'c',instrumentId:'i',receivedDate:'2026-11-12',dueDate:'',complaint:'',diagnosis:'',condition:'',accessories:'',status,approval:'Pendente',items:[{description:'Regulagem',quantity:1,price:150}],photos:[],paid:50,paymentMethod:'Pix',warrantyDays:90,notes:''}],
  settings:{name:'Bueno Luthier',phone:'',address:'',document:'',terms:'',warranty:90}
 };
}

test('o menu oferece somente os seis status do fluxo simplificado',()=>{
 const m=app.match(/const STATUS=(\[[^;]+\]);/);
 assert.ok(m);
 const lista=JSON.parse(m[1].replace(/'/g,'"'));
 assert.deepEqual(lista,ativos);
 for(const status of antigos) assert.equal(lista.includes(status),false);
 assert.ok(app.includes("o.status||'Em execução'"));
 assert.ok(app.includes('opcaoStatusAntigo(o.status)'));
});

test('API de status aceita somente opções ativas',()=>{
 for(const status of ativos) assert.equal(validarStatus(status),status);
 for(const status of antigos) assert.throws(()=>validarStatus(status),/não reconhecido/);
});

test('ordens antigas podem ser lidas e atualizadas sem perder o histórico',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'bueno-estados-legados-'));
 const dbfile=path.join(tmp,'db.sqlite');
 let service=criarOficinaService(criarRepositorio(dbfile));
 try {
  service.salvar({revision:0,state:dados()});
  service.fechar();
  const db=new DatabaseSync(dbfile);db.prepare('UPDATE ordens_servico SET status=? WHERE id=?').run('Recebido','o');db.close();
  service=criarOficinaService(criarRepositorio(dbfile));
  const antes=service.recuperar();
  assert.equal(antes.state.orders[0].status,'Recebido');
  const salvo=service.salvar({revision:antes.revision,state:antes.state});
  assert.equal(salvo.state.orders[0].status,'Recebido');
  const novo=service.alterarStatus({id:'o',revision:salvo.revision,status:'Aprovado'});
  assert.equal(novo.status,'Aprovado');
  assert.equal(service.recuperar().state.orders[0].paid,50);
  assert.throws(()=>service.alterarStatus({id:'o',revision:novo.revision,status:'Recebido'}),/não reconhecido/);
  assert.throws(()=>service.salvar({revision:novo.revision,state:dados('Em avaliação')}),/status foi desativado/);
  assert.equal(validarEstado({revision:0,state:dados('Recebido')}).state.orders[0].status,'Recebido');
 } finally {try{service.fechar()}catch{}fs.rmSync(tmp,{recursive:true,force:true})}
});
