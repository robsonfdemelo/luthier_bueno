'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const {inicializarSchema} = require('./schema');

function abrirConexao(arquivo) {
  fs.mkdirSync(path.dirname(arquivo), {recursive:true});
  const db = new DatabaseSync(arquivo);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  inicializarSchema(db);
  return db;
}

module.exports = {abrirConexao};
