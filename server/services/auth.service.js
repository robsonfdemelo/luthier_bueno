'use strict';

const {randomBytes, createHash, timingSafeEqual} = require('node:crypto');
const {ErroValidacao} = require('../validators/estado.validator');
const TEMPO_SESSAO = 7 * 24 * 60 * 60 * 1000;

function criarAuthService({password,production}) {
  const sessoes = new Map();
  const tentativas = new Map();
  function digest(valor) {return createHash('sha256').update(valor).digest('hex');}
  function senhaConfere(valor) {
    const esperado = createHash('sha256').update(password).digest();
    const recebido = createHash('sha256').update(valor).digest();
    return timingSafeEqual(esperado, recebido);
  }
  function autenticado(token) {
    if (!password) return true;
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
    const chave = digest(token);
    const validade = sessoes.get(chave);
    if (!validade) return false;
    if (validade < Date.now()) {sessoes.delete(chave);return false;}
    return true;
  }
  function login(ip, senha) {
    if (!password) throw new ErroValidacao('Login não necessário nesta instalação.',400);
    const atual = tentativas.get(ip);
    if (atual && atual.ate > Date.now() && atual.contagem >= 10) {
      throw new ErroValidacao('Muitas tentativas. Tente novamente mais tarde.',429);
    }
    if (typeof senha !== 'string' || !senhaConfere(senha)) {
      tentativas.set(ip,{contagem:atual && atual.ate>Date.now()?atual.contagem+1:1,ate:Date.now()+15*60*1000});
      throw new ErroValidacao('Senha incorreta.',401);
    }
    tentativas.delete(ip);
    const token = randomBytes(32).toString('base64url');
    sessoes.set(digest(token),Date.now()+TEMPO_SESSAO);
    return token;
  }
  function logout(token) {if(token)sessoes.delete(digest(token));}
  function cookieSessao(token,idade) {
    return `bueno_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${idade}${production?'; Secure':''}`;
  }
  return {autenticado,login,logout,cookieSessao,tempoSessao:TEMPO_SESSAO,loginAtivo:Boolean(password)};
}

module.exports = {criarAuthService};
