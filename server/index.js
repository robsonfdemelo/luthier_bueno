'use strict';

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const {randomBytes,createHash,timingSafeEqual} = require('node:crypto');
const {criarBanco} = require('./banco');
const {ErroValidacao} = require('./validacao');

const raiz = path.resolve(__dirname, '..');
const porta = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const senhaAcesso = process.env.APP_PASSWORD || '';
const emProducao = process.env.NODE_ENV === 'production';
if (emProducao && (senhaAcesso.length < 12 || host === '127.0.0.1')) {
  console.error('Configure APP_PASSWORD com 12+ caracteres e HOST=0.0.0.0 na hospedagem.');
  process.exit(1);
}
const sessoes = new Map();
const tentativas = new Map();
const TEMPO_SESSAO = 7 * 24 * 60 * 60 * 1000;
function digest(v) {return createHash('sha256').update(v).digest('hex');}
function senhaConfere(senha) {
  const esperado = createHash('sha256').update(senhaAcesso).digest();
  const recebido = createHash('sha256').update(senha).digest();
  return timingSafeEqual(esperado, recebido);
}
function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(x=>x.includes('=')).map(x=>{const n=x.indexOf('=');return [x.slice(0,n),x.slice(n+1)];}));
}
function autenticado(req) {
  if (!senhaAcesso) return true;
  const token = cookies(req).bueno_session;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const chave = digest(token);
  const validade = sessoes.get(chave);
  if (!validade) return false;
  if (validade < Date.now()) {sessoes.delete(chave);return false;}
  return true;
}
function headersSeguranca(res) {
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Content-Type-Options','nosniff');
}
function cookieSessao(token,idade) {
  return `bueno_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${idade}${emProducao?'; Secure':''}`;
}
function redirecionar(res,onde) {res.writeHead(302,{Location:onde,'Cache-Control':'no-store'});res.end();}

const arquivoBanco = path.resolve(process.env.DB_FILE || path.join(raiz, 'data', 'bueno-luthier.sqlite'));
const banco = criarBanco(arquivoBanco);
const publicos = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/assets/logo-marca.webp': ['assets/logo-marca.webp', 'image/webp'],
  '/assets/logo-completo.webp': ['assets/logo-completo.webp', 'image/webp'],
  '/assets/logo-original.png': ['assets/logo-original.png', 'image/png'],
};

function json(res, status, valor) {
  const corpo = JSON.stringify(valor);
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(corpo), 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
  res.end(corpo);
}
function lerJson(req, max = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let tamanho = 0;
    const partes = [];
    req.on('data', bloco => {
      tamanho += bloco.length;
      if (tamanho > max) {
        reject(new ErroValidacao(`Arquivo grande demais (máximo de ${Math.ceil(max / (1024*1024))} MB).`, 413));
        req.destroy();
        return;
      }
      partes.push(bloco);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(partes).toString('utf8'))); }
      catch { reject(new ErroValidacao('JSON inválido.')); }
    });
    req.on('error', reject);
  });
}
function validarOrigem(req) {
  if (!(req.headers['content-type'] || '').includes('application/json')) {
    throw new ErroValidacao('Envie Content-Type: application/json.', 415);
  }
  const origem = req.headers.origin;
  if (origem && new URL(origem).host !== req.headers.host) throw new ErroValidacao('Origem não autorizada.', 403);
}

const servidor = http.createServer(async (req, res) => {
  try {
    headersSeguranca(res);
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, {ok:true});
    if (req.method === 'GET' && url.pathname === '/entrar') {
      if (!senhaAcesso || autenticado(req)) return redirecionar(res,'/');
      const html = fs.readFileSync(path.join(raiz,'public','entrar.html'));
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
      return res.end(html);
    }
    if (req.method === 'POST' && url.pathname === '/api/login') {
      if (!senhaAcesso) return json(res,400,{erro:'Login não necessário nesta instalação.'});
      validarOrigem(req);
      const ip = req.socket.remoteAddress || 'desconhecido';
      const atual = tentativas.get(ip);
      if (atual && atual.ate > Date.now() && atual.contagem >= 10) return json(res,429,{erro:'Muitas tentativas. Tente novamente mais tarde.'});
      const dados = await lerJson(req,4096);
      if (typeof dados.senha !== 'string' || !senhaConfere(dados.senha)) {
        tentativas.set(ip,{contagem:atual && atual.ate > Date.now()?atual.contagem+1:1, ate:Date.now()+15*60*1000});
        return json(res,401,{erro:'Senha incorreta.'});
      }
      tentativas.delete(ip);
      const token = randomBytes(32).toString('base64url');
      sessoes.set(digest(token),Date.now()+TEMPO_SESSAO);
      res.setHeader('Set-Cookie',cookieSessao(token,Math.floor(TEMPO_SESSAO/1000)));
      return json(res,200,{ok:true});
    }
    if (req.method === 'POST' && url.pathname === '/api/logout') {
      validarOrigem(req);
      const token = cookies(req).bueno_session;
      if (token) sessoes.delete(digest(token));
      res.setHeader('Set-Cookie',cookieSessao('',0));
      return json(res,200,{ok:true});
    }
    if (!autenticado(req)) {
      if (req.method === 'GET' && url.pathname === '/assets/logo-marca.webp') {
        const img = fs.readFileSync(path.join(raiz,'public','assets/logo-marca.webp'));
        res.writeHead(200,{'Content-Type':'image/webp','Content-Length':img.length,'Cache-Control':'public, max-age=600'});
        return res.end(img);
      }
      if (url.pathname.startsWith('/api/')) return json(res,401,{erro:'Sessão expirada. Faça login novamente.'});
      return redirecionar(res,'/entrar');
    }
    if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, {...banco.recuperar(), loginAtivo: Boolean(senhaAcesso)});
    if (req.method === 'GET' && url.pathname === '/api/backup') return json(res, 200, banco.exportarBackup());
    if (req.method === 'GET' && url.pathname.startsWith('/api/photos/')) {
      const foto = banco.obterFoto(url.pathname.slice('/api/photos/'.length));
      if (!foto) return json(res, 404, {erro:'Foto não encontrada.'});
      res.writeHead(200, {'Content-Type':foto.mime, 'Content-Length':foto.bytes.length, 'Content-Disposition':'inline', 'Cache-Control':'private, max-age=60', 'X-Content-Type-Options':'nosniff'});
      return res.end(foto.bytes);
    }
    if (req.method === 'PUT' && url.pathname === '/api/state') {
      validarOrigem(req);
      return json(res, 200, banco.salvar(await lerJson(req, 12 * 1024 * 1024)));
    }
    if (req.method === 'POST' && url.pathname === '/api/photos') {
      validarOrigem(req);
      return json(res, 201, banco.subirFoto(await lerJson(req, 3 * 1024 * 1024)));
    }
    if (req.method === 'POST' && url.pathname === '/api/restore') {
      validarOrigem(req);
      return json(res, 200, banco.restaurar(await lerJson(req, 100 * 1024 * 1024)));
    }
    if (req.method === 'GET' && Object.hasOwn(publicos, url.pathname)) {
      const [relative, mime] = publicos[url.pathname];
      const conteudo = fs.readFileSync(path.join(raiz,'public',relative));
      res.writeHead(200, {'Content-Type':mime, 'Content-Length':conteudo.length, 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-cache'});
      return res.end(conteudo);
    }
    return json(res, 404, {erro:'Rota não encontrada.'});
  } catch (erro) {
    const status = erro instanceof ErroValidacao ? erro.status : 500;
    if (status === 500) console.error('[Erro interno]', erro);
    if (!res.headersSent && !res.destroyed) json(res, status, {erro: status === 500 ? 'Erro interno no servidor.' : erro.message});
  }
});

servidor.listen(porta, host, () => {
  console.log(`\n🎸 Bueno Luthier iniciado em http://${host}:${porta}`);
  console.log(`Banco de dados: ${arquivoBanco}`);
  console.log('Para encerrar, use Ctrl + C.\n');
});
function encerrar() {servidor.close(() => {banco.fechar(); process.exit(0);});}
process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);
