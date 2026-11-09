'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {spawn,spawnSync} = require('node:child_process');
const {mkdtempSync,rmSync} = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const root = path.resolve(__dirname,'..');
const senha = 'SenhaForteApenasParaTeste!';
function portaLivre(){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});}
async function pronto(url,processo){
  for(let i=0;i<90;i++){
    if(processo.exitCode!==null)throw Error('Servidor encerrou antes da inicialização');
    try{const r=await fetch(url+'/api/health');if(r.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,70));
  }
  throw Error('Servidor não iniciou');
}
test('produção sem senha não inicia servidor exposto',()=>{
  const r=spawnSync(process.execPath,['server/index.js'],{cwd:root,env:{...process.env,NODE_ENV:'production',HOST:'0.0.0.0',APP_PASSWORD:''},timeout:3000,encoding:'utf8'});
  assert.equal(r.status,1);
  assert.match(r.stderr,/APP_PASSWORD/);
});
test('sessão protege tela, clientes, fotos, backup e logout',async()=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'bueno-auth-'));
  const port=await portaLivre();
  const url=`http://127.0.0.1:${port}`;
  const proc=spawn(process.execPath,['server/index.js'],{cwd:root,env:{...process.env,NODE_ENV:'development',HOST:'127.0.0.1',PORT:String(port),APP_PASSWORD:senha,DB_FILE:path.join(dir,'teste.sqlite')},stdio:'ignore'});
  try{
    await pronto(url,proc);
    const index=await fetch(url+'/',{redirect:'manual'});assert.equal(index.status,302);assert.equal(index.headers.get('location'),'/entrar');
    const loginPage=await fetch(url+'/entrar');assert.equal(loginPage.status,200);assert.match(await loginPage.text(),/Bueno Luthier/);
    const stateOff=await fetch(url+'/api/state');assert.equal(stateOff.status,401);
    const photoOff=await fetch(url+'/api/photos/foto-id');assert.equal(photoOff.status,401);
    const backupOff=await fetch(url+'/api/backup');assert.equal(backupOff.status,401);
    const wrong=await fetch(url+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({senha:'errada'})});assert.equal(wrong.status,401);
    const right=await fetch(url+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({senha})});assert.equal(right.status,200);
    const cookie=right.headers.get('set-cookie').split(';')[0];assert.match(right.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
    const ok=await fetch(url+'/api/state',{headers:{Cookie:cookie}});assert.equal(ok.status,200);const json=await ok.json();assert.equal(json.loginAtivo,true);assert.deepEqual(json.state.orders,[]);
    const home=await fetch(url+'/',{headers:{Cookie:cookie}});assert.equal(home.status,200);
    const logout=await fetch(url+'/api/logout',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:'{}'});assert.equal(logout.status,200);
    const again=await fetch(url+'/api/state',{headers:{Cookie:cookie}});assert.equal(again.status,401);
  } finally {
    proc.kill('SIGTERM');
    await new Promise(resolve=>{if(proc.exitCode!==null || proc.signalCode)resolve();else{proc.once('exit',resolve);setTimeout(resolve,1000);}});
    rmSync(dir,{force:true,recursive:true});
  }
});
