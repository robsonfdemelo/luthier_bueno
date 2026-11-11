'use strict';

const {cookie} = require('../http/request');
const {json,redirect,headersSeguranca} = require('../http/response');
const {ErroValidacao} = require('../validators/estado.validator');

function criarRoteador({authService,authController,oficinaController,pagesController}){
  return async (req,res)=>{
    try{
      headersSeguranca(res);
      const url=new URL(req.url,'http://127.0.0.1');
      const caminho=url.pathname;
      const metodo=req.method;
      if(metodo==='GET'&&caminho==='/api/health')return json(res,200,{ok:true});
      const autorizado=authService.autenticado(cookie(req,'bueno_session'));
      if(metodo==='GET'&&caminho==='/entrar')return pagesController.entrar(req,res,autorizado);
      if(metodo==='POST'&&caminho==='/api/login')return await authController.login(req,res);
      if(metodo==='POST'&&caminho==='/api/logout')return authController.logout(req,res);
      if(!autorizado){
        if(metodo==='GET'&&caminho==='/assets/logo-marca.webp')return pagesController.estatico(req,res,caminho);
        if(caminho.startsWith('/api/'))return json(res,401,{erro:'Sessão expirada. Faça login novamente.'});
        return redirect(res,'/entrar');
      }
      if(metodo==='GET'&&caminho==='/api/state')return oficinaController.state(req,res);
      if(metodo==='GET'&&caminho==='/api/backup')return oficinaController.backup(req,res);
      if(metodo==='GET'&&caminho.startsWith('/api/photos/'))return oficinaController.foto(req,res,caminho.slice('/api/photos/'.length));
      const status=/^\/api\/orders\/([A-Za-z0-9_-]{1,80})\/status$/.exec(caminho);
      if(metodo==='PATCH'&&status)return await oficinaController.status(req,res,status[1]);
      if(metodo==='PUT'&&caminho==='/api/state')return await oficinaController.salvar(req,res);
      if(metodo==='POST'&&caminho==='/api/photos')return await oficinaController.subirFoto(req,res);
      if(metodo==='POST'&&caminho==='/api/restore')return await oficinaController.restaurar(req,res);
      if(metodo==='GET'&&pagesController.estatico(req,res,caminho))return;
      return json(res,404,{erro:'Rota não encontrada.'});
    }catch(erro){
      const status=erro instanceof ErroValidacao?erro.status:500;
      if(status===500)console.error('[Erro interno]',erro);
      if(!res.headersSent&&!res.destroyed)json(res,status,{erro:status===500?'Erro interno no servidor.':erro.message});
    }
  };
}
module.exports={criarRoteador};
