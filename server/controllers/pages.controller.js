'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {redirect,arquivo} = require('../http/response');

const arquivos={
  '/':['index.html','text/html; charset=utf-8'],
  '/index.html':['index.html','text/html; charset=utf-8'],
  '/app.js':['app.js','text/javascript; charset=utf-8'],
  '/styles.css':['styles.css','text/css; charset=utf-8'],
  '/assets/logo-marca.webp':['assets/logo-marca.webp','image/webp'],
  '/assets/logo-completo.webp':['assets/logo-completo.webp','image/webp'],
  '/assets/logo-original.png':['assets/logo-original.png','image/png'],
};
function criarPagesController(raiz,authService){
  const pasta=path.join(raiz,'public');
  function entrar(req,res,autenticado){
    if(!authService.loginAtivo||autenticado)return redirect(res,'/');
    return arquivo(res,fs.readFileSync(path.join(pasta,'entrar.html')),'text/html; charset=utf-8','no-store');
  }
  function estatico(req,res,caminho){
    if(!Object.hasOwn(arquivos,caminho))return false;
    const [relative,mime]=arquivos[caminho];
    arquivo(res,fs.readFileSync(path.join(pasta,relative)),mime);
    return true;
  }
  return {entrar,estatico};
}
module.exports={criarPagesController};
