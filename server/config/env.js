'use strict';

const path = require('node:path');

function carregarConfiguracao() {
  const raiz = path.resolve(__dirname,'../..');
  const porta = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const password = process.env.APP_PASSWORD || '';
  const production = process.env.NODE_ENV === 'production';
  if (production && (password.length < 12 || host === '127.0.0.1')) {
    throw new Error('Configure APP_PASSWORD com 12+ caracteres e HOST=0.0.0.0 na hospedagem.');
  }
  if (!Number.isSafeInteger(porta) || porta < 1 || porta > 65535) throw new Error('PORT inválida.');
  return {
    raiz,porta,host,password,production,
    arquivoBanco:path.resolve(process.env.DB_FILE || path.join(raiz,'data','bueno-luthier.sqlite')),
  };
}

module.exports = {carregarConfiguracao};
