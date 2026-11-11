'use strict';

const http = require('node:http');
const {carregarConfiguracao} = require('./config/env');
const {criarRepositorio} = require('./repositories/oficina.repository');
const {criarOficinaService} = require('./services/oficina.service');
const {criarAuthService} = require('./services/auth.service');
const {criarAuthController} = require('./controllers/auth.controller');
const {criarOficinaController} = require('./controllers/oficina.controller');
const {criarPagesController} = require('./controllers/pages.controller');
const {criarRoteador} = require('./routes');

let config;
try{config=carregarConfiguracao();}
catch(erro){console.error(erro.message);process.exit(1);}

const repo=criarRepositorio(config.arquivoBanco);
const oficinaService=criarOficinaService(repo);
const authService=criarAuthService(config);
const app=criarRoteador({
  authService,
  authController:criarAuthController(authService),
  oficinaController:criarOficinaController(oficinaService,authService),
  pagesController:criarPagesController(config.raiz,authService),
});
const servidor=http.createServer(app);
servidor.listen(config.porta,config.host,()=>{
  console.log(`\n🎸 Bueno Luthier iniciado em http://${config.host}:${config.porta}`);
  console.log(`Banco de dados: ${config.arquivoBanco}`);
  console.log('Para encerrar, use Ctrl + C.\n');
});
function encerrar(){servidor.close(()=>{oficinaService.fechar();process.exit(0);});}
process.on('SIGINT',encerrar);
process.on('SIGTERM',encerrar);
