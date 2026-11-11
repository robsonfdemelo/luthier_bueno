'use strict';

function headersSeguranca(res){
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');
}
function json(res,status,valor){
  const corpo=JSON.stringify(valor);
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(corpo),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(corpo);
}
function redirect(res,onde){res.writeHead(302,{Location:onde,'Cache-Control':'no-store'});res.end();}
function arquivo(res,conteudo,mime,cache='no-cache'){
  res.writeHead(200,{'Content-Type':mime,'Content-Length':conteudo.length,'Cache-Control':cache,'X-Content-Type-Options':'nosniff'});
  res.end(conteudo);
}
module.exports={headersSeguranca,json,redirect,arquivo};
