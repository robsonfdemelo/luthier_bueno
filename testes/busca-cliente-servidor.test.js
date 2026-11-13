'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const {criarRepositorio}=require('../server/repositories/oficina.repository');
const {criarOficinaService}=require('../server/services/oficina.service');
const root=path.resolve(__dirname,'..');
const password='SenhaSomenteTeste123!';
function fixture(){
 const stamp='2026-11-13T10:00:00.000Z';
 return {version:3,seq:0,customers:[
  {id:'c01',name:'TESTE 123',phone:'(62) 99999-1234',email:'',document:'',notes:''},
  {id:'c02',name:'João da Silva',phone:'(62) 98888-7777',email:'',document:'',notes:''}
 ],instruments:[],orders:[],settings:{name:'Bueno Luthier',phone:'',address:'',document:'',terms:'Termos de teste',warranty:90}};
}
function portaLivre(){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});}
async function aguardar(base,proc){for(let i=0;i<80;i++){if(proc.exitCode!==null)throw Error('Servidor não iniciou');try{if((await fetch(base+'/api/health')).ok)return}catch{}await new Promise(r=>setTimeout(r,75))}throw Error('Timeout do servidor')}
test('pesquisa SQLite retorna TESTE 123 por fragmento, nome sem acento e telefone',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'bueno-clientes-db-'));
 const svc=criarOficinaService(criarRepositorio(path.join(dir,'db.sqlite')));
 try{
  svc.salvar({revision:0,state:fixture()});
  let r=svc.buscarClientes('teste');assert.equal(r.customers.length,1);assert.equal(r.customers[0].name,'TESTE 123');assert.equal(r.total,2);
  r=svc.buscarClientes('JOAO');assert.equal(r.customers[0].name,'João da Silva');
  r=svc.buscarClientes('999991234');assert.equal(r.customers[0].name,'TESTE 123');
  r=svc.buscarClientes('nao existe');assert.equal(r.customers.length,0);assert.equal(r.total,2);
  assert.throws(()=>svc.buscarClientes('x'.repeat(121)),{status:400});
 }finally{svc.fechar();rmSync(dir,{recursive:true,force:true})}
});
test('API de clientes exige login e devolve lista atualizada diretamente do banco',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'bueno-clientes-http-'));
 const file=path.join(dir,'db.sqlite');const svc=criarOficinaService(criarRepositorio(file));svc.salvar({revision:0,state:fixture()});svc.fechar();
 const port=await portaLivre();const base='http://127.0.0.1:'+port;
 const proc=spawn(process.execPath,['server/index.js'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),NODE_ENV:'development',DB_FILE:file,APP_PASSWORD:password},stdio:'ignore'});
 try{
  await aguardar(base,proc);
  let r=await fetch(base+'/api/customers/search?q=teste');assert.equal(r.status,401);
  r=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({senha:password})});
  assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];
  r=await fetch(base+'/api/customers/search?q=teste',{headers:{Cookie:cookie}});assert.equal(r.status,200);
  const json=await r.json();assert.equal(json.customers.length,1);assert.equal(json.customers[0].name,'TESTE 123');assert.equal(json.revision,1);
  r=await fetch(base+'/api/customers/search?q=inexistente',{headers:{Cookie:cookie}});assert.equal((await r.json()).total,2);
 }finally{
  proc.kill('SIGTERM');await new Promise(resolve=>{if(proc.exitCode!==null||proc.signalCode)resolve();else{proc.once('exit',resolve);setTimeout(resolve,1000)}});
  rmSync(dir,{force:true,recursive:true});
 }
});
test('frontend busca o cadastro atualizado com debounce e avisa quando não existe no banco',()=>{
 const source=require('node:fs').readFileSync(path.join(root,'public/app.js'),'utf8');
 assert.match(source,/\/api\/customers\/search\?q=/);
 assert.match(source,/function agendarBuscaCliente/);
 assert.match(source,/Nenhum resultado para/);
 assert.match(source,/const quantidade=resultadosBuscaCliente/);
});
