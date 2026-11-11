'use strict';

const {lerJson,validarOrigem} = require('../http/request');
const {json,arquivo} = require('../http/response');

function criarOficinaController(oficinaService,authService){
  function state(req,res){json(res,200,{...oficinaService.recuperar(),loginAtivo:authService.loginAtivo});}
  function backup(req,res){json(res,200,oficinaService.exportarBackup());}
  function foto(req,res,id){
    const f=oficinaService.obterFoto(id);
    if(!f)return json(res,404,{erro:'Foto não encontrada.'});
    arquivo(res,f.bytes,f.mime,'private, max-age=60');
  }
  async function salvar(req,res){
    validarOrigem(req);
    json(res,200,oficinaService.salvar(await lerJson(req,12*1024*1024)));
  }
  async function status(req,res,id){
    validarOrigem(req);
    const dados=await lerJson(req,4096);
    json(res,200,oficinaService.alterarStatus({id,revision:dados?.revision,status:dados?.status}));
  }
  async function subirFoto(req,res){
    validarOrigem(req);
    json(res,201,oficinaService.subirFoto(await lerJson(req,3*1024*1024)));
  }
  async function restaurar(req,res){
    validarOrigem(req);
    json(res,200,oficinaService.restaurar(await lerJson(req,100*1024*1024)));
  }
  return {state,backup,foto,salvar,status,subirFoto,restaurar};
}
module.exports={criarOficinaController};
