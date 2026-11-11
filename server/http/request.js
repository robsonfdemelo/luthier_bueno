'use strict';

const {ErroValidacao} = require('../validators/estado.validator');

function lerJson(req, max = 5 * 1024 * 1024) {
  return new Promise((resolve,reject)=>{
    let tamanho=0;
    const partes=[];
    let excedeu=false;
    req.on('data',bloco=>{
      if(excedeu)return;
      tamanho+=bloco.length;
      if(tamanho>max){
        excedeu=true;
        reject(new ErroValidacao(`Arquivo grande demais (máximo de ${Math.ceil(max / (1024*1024))} MB).`,413));
        // Não destrói a conexão antes de enviar o HTTP 413.
        req.resume();
        return;
      }
      partes.push(bloco);
    });
    req.on('end',()=>{
      if(excedeu)return;
      try{resolve(JSON.parse(Buffer.concat(partes).toString('utf8')));}
      catch{reject(new ErroValidacao('JSON inválido.'));}
    });
    req.on('error',reject);
  });
}
function validarOrigem(req) {
  if (!(req.headers['content-type'] || '').includes('application/json')) {
    throw new ErroValidacao('Envie Content-Type: application/json.',415);
  }
  const origem=req.headers.origin;
  if(origem){
    let host;
    try{host=new URL(origem).host;}catch{throw new ErroValidacao('Origem não autorizada.',403);}
    if(host!==req.headers.host)throw new ErroValidacao('Origem não autorizada.',403);
  }
}
function cookie(req,nome){
  const encontrados=String(req.headers.cookie||'').split(';').map(x=>x.trim());
  for(const item of encontrados){
    const idx=item.indexOf('=');
    if(idx>-1 && item.slice(0,idx)===nome)return item.slice(idx+1);
  }
  return '';
}
module.exports = {lerJson,validarOrigem,cookie};
