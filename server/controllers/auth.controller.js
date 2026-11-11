'use strict';

const {lerJson,validarOrigem,cookie} = require('../http/request');
const {json} = require('../http/response');

function criarAuthController(authService){
  async function login(req,res){
    validarOrigem(req);
    const dados=await lerJson(req,4096);
    const token=authService.login(req.socket.remoteAddress||'desconhecido',dados?.senha);
    res.setHeader('Set-Cookie',authService.cookieSessao(token,Math.floor(authService.tempoSessao/1000)));
    json(res,200,{ok:true});
  }
  function logout(req,res){
    validarOrigem(req);
    authService.logout(cookie(req,'bueno_session'));
    res.setHeader('Set-Cookie',authService.cookieSessao('',0));
    json(res,200,{ok:true});
  }
  return {login,logout};
}
module.exports={criarAuthController};
