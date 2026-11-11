'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const {criarOficinaService} = require('../server/services/oficina.service');
const {criarAuthService} = require('../server/services/auth.service');
const {carregarConfiguracao} = require('../server/config/env');

test('service valida status antes de chamar o repository', () => {
  const chamadas=[];
  const repositorio={alterarStatus(dados){chamadas.push(dados);return {...dados,updatedAt:'2026-11-11T10:00:00.000Z'};}};
  const service=criarOficinaService(repositorio);
  assert.throws(()=>service.alterarStatus({id:'os-1',revision:1,status:'Inexistente'}), /Status não reconhecido/);
  assert.throws(()=>service.alterarStatus({id:'../../invalido',revision:1,status:'Recebido'}), /Identificador/);
  assert.equal(chamadas.length,0);
  const retorno=service.alterarStatus({id:'os-1',revision:1,status:'Em execução'});
  assert.equal(retorno.status,'Em execução');
  assert.equal(chamadas.length,1);
});

test('auth service autentica, encerra sessão e não aceita senha inválida', () => {
  const auth=criarAuthService({password:'SenhaForteSomenteTeste123',production:false});
  assert.equal(auth.autenticado(''),false);
  assert.throws(()=>auth.login('127.0.0.1','incorreta'),{status:401});
  const token=auth.login('127.0.0.1','SenhaForteSomenteTeste123');
  assert.equal(auth.autenticado(token),true);
  auth.logout(token);
  assert.equal(auth.autenticado(token),false);
});

test('configuração reconhece DB_FILE e PORT sem mudar o contrato da Railway', () => {
  const configuracao=carregarConfiguracao();
  assert.equal(typeof configuracao.arquivoBanco,'string');
  assert.ok(configuracao.arquivoBanco.endsWith('.sqlite'));
  assert.ok(Number.isInteger(configuracao.porta));
});
