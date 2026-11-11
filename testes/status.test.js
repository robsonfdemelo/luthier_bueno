'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtempSync,rmSync}=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const {criarBanco}=require('../server/banco');
const root=path.resolve(__dirname,'..');
const senha='SenhaTesteForte0123!';
function estado(){
  const instante='2026-11-11T10:00:00.000Z';
  return {version:3,seq:1,customers:[{id:'cliente-1',name:'Cliente Teste',phone:'(62) 90000-0000',email:'',document:'',notes:''}],
    instruments:[{id:'inst-1',customerId:'cliente-1',type:'Violão',brand:'Takamine',model:'P3DC',serial:'',color:'',condition:'',notes:''}],
    orders:[{id:'ordem-1',number:'OS-00001',createdAt:instante,updatedAt:instante,customerId:'cliente-1',instrumentId:'inst-1',
      receivedDate:'2026-11-11',dueDate:'',complaint:'',diagnosis:'',condition:'',accessories:'',status:'Recebido',approval:'Pendente',
      items:[{description:'Regulagem',quantity:1,price:150}],photos:[],paid:50,paymentMethod:'Pix',warrantyDays:90,notes:''}],
    settings:{name:'Bueno Luthier',phone:'',address:'',document:'',terms:'Termos de teste',warranty:90}};
}
function portaLivre(){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});}
async function aguardar(url, proc){
  for(let t=0;t<100;t++){
    if(proc.exitCode!==null)throw Error('Servidor encerrou inesperadamente.');
    try{if((await fetch(url+'/api/health')).ok)return}catch{}
    await new Promise(r=>setTimeout(r,70));
  }
  throw Error('Servidor não respondeu');
}
test('SQLite altera apenas o status, sem recriar registros, e mantém a revisão correta',()=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'bueno-status-banco-'));
  const file=path.join(dir,'db.sqlite');
  const banco=criarBanco(file);
  try{
    banco.salvar({revision:0,state:estado()});
    const resp=banco.alterarStatus({id:'ordem-1',revision:1,status:'Em execução'});
    assert.equal(resp.revision,2);
    assert.equal(resp.status,'Em execução');
    const snapshot=banco.recuperar();
    assert.equal(snapshot.revision,2);
    assert.equal(snapshot.state.orders[0].status,'Em execução');
    assert.equal(snapshot.state.orders[0].items[0].price,150);
    assert.equal(snapshot.state.orders[0].paid,50);
    assert.equal(snapshot.state.customers[0].name,'Cliente Teste');
    assert.throws(()=>banco.alterarStatus({id:'ordem-1',revision:1,status:'Entregue'}),{status:409});
    assert.throws(()=>banco.alterarStatus({id:'ordem-1',revision:2,status:'Indefinido'}),{status:400});
    assert.throws(()=>banco.alterarStatus({id:'ordem-404',revision:2,status:'Entregue'}),{status:404});
    assert.equal(banco.recuperar().revision,2);
    const idem=banco.alterarStatus({id:'ordem-1',revision:2,status:'Em execução'});
    assert.equal(idem.revision,2);
    banco.fechar();
    const reaberto=criarBanco(file);
    try{assert.equal(reaberto.recuperar().state.orders[0].status,'Em execução')}finally{reaberto.fechar()}
  }finally{
    try{banco.fechar()}catch{}
    rmSync(dir,{recursive:true,force:true});
  }
});
test('API PATCH altera status com sessão, bloqueia acesso anônimo e detecta revisão desatualizada',async()=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'bueno-status-http-'));
  const file=path.join(dir,'db.sqlite');
  const b=criarBanco(file);b.salvar({revision:0,state:estado()});b.fechar();
  const port=await portaLivre();const base='http://127.0.0.1:'+port;
  const proc=spawn(process.execPath,['server/index.js'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',NODE_ENV:'development',DB_FILE:file,APP_PASSWORD:senha},stdio:'ignore'});
  try{
    await aguardar(base,proc);
    const target=base+'/api/orders/ordem-1/status';
    const headers={'Content-Type':'application/json'};
    let r=await fetch(target,{method:'PATCH',headers,body:JSON.stringify({revision:1,status:'Em execução'})});
    assert.equal(r.status,401);
    r=await fetch(base+'/api/login',{method:'POST',headers,body:JSON.stringify({senha})});
    assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];
    const h={...headers,Cookie:cookie};
    r=await fetch(target,{method:'PATCH',headers:{...h,Origin:'https://dominio-malicioso.example'},body:JSON.stringify({revision:1,status:'Em execução'})});
    assert.equal(r.status,403);
    r=await fetch(target,{method:'PATCH',headers:h,body:JSON.stringify({revision:1,status:'Em execução'})});
    assert.equal(r.status,200);const ok=await r.json();assert.equal(ok.status,'Em execução');assert.equal(ok.revision,2);
    r=await fetch(target,{method:'PATCH',headers:h,body:JSON.stringify({revision:1,status:'Entregue'})});
    assert.equal(r.status,409);
    r=await fetch(base+'/api/state',{headers:{Cookie:cookie}});assert.equal(r.status,200);
    const result=await r.json();assert.equal(result.state.orders[0].status,'Em execução');
    assert.equal(result.state.orders[0].items[0].description,'Regulagem');
    assert.equal(result.state.customers[0].name,'Cliente Teste');
  }finally{
    proc.kill('SIGTERM');
    await new Promise(resolve=>{if(proc.exitCode!==null||proc.signalCode)resolve();else {proc.once('exit',resolve);setTimeout(resolve,1000);}});
    rmSync(dir,{recursive:true,force:true});
  }
});
