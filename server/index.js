'use strict';

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const {criarBanco} = require('./banco');
const {ErroValidacao} = require('./validacao');

const raiz = path.resolve(__dirname, '..');
const porta = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
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
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, {ok:true, banco:'SQLite'});
    if (req.method === 'GET' && url.pathname === '/api/state') return json(res, 200, banco.recuperar());
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
