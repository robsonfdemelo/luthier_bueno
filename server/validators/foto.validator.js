'use strict';

const {ErroValidacao} = require('./estado.validator');
const TIPOS_IMAGEM = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FOTO_BYTES = 2 * 1024 * 1024;

function verificarImagem(mime, buffer) {
  if (!TIPOS_IMAGEM.has(mime)) throw new ErroValidacao('Foto inválida: envie JPG, PNG ou WebP.');
  if (!buffer.length || buffer.length > MAX_FOTO_BYTES) throw new ErroValidacao('Cada foto precisa ter no máximo 2 MB.');
  const jpg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  const webp = buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (!(mime === 'image/jpeg' && jpg || mime === 'image/png' && png || mime === 'image/webp' && webp)) {
    throw new ErroValidacao('O conteúdo do arquivo não corresponde a uma imagem válida.');
  }
}
function lerBase64(base64, mime) {
  if (typeof base64 !== 'string' || !base64.length || base64.length > Math.ceil(MAX_FOTO_BYTES / 3) * 4 + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new ErroValidacao('Dados da imagem inválidos ou grandes demais.');
  }
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.toString('base64') !== base64) throw new ErroValidacao('Codificação da foto inválida.');
  verificarImagem(mime, buffer);
  return buffer;
}

module.exports = {lerBase64, MAX_FOTO_BYTES};
