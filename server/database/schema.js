'use strict';

const TERMOS_PADRAO = 'O orçamento e a execução dos serviços dependem de aprovação do cliente. Alterações no valor ou no prazo serão comunicadas previamente.';

function inicializarSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY, nome TEXT NOT NULL, telefone TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '', documento TEXT NOT NULL DEFAULT '', observacoes TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS instrumentos (
      id TEXT PRIMARY KEY, cliente_id TEXT NOT NULL REFERENCES clientes(id), tipo TEXT NOT NULL,
      marca TEXT NOT NULL DEFAULT '', modelo TEXT NOT NULL DEFAULT '', serie TEXT NOT NULL DEFAULT '',
      cor TEXT NOT NULL DEFAULT '', condicao TEXT NOT NULL DEFAULT '', observacoes TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS ordens_servico (
      id TEXT PRIMARY KEY, numero TEXT NOT NULL UNIQUE,
      criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL,
      cliente_id TEXT NOT NULL REFERENCES clientes(id),
      instrumento_id TEXT NOT NULL REFERENCES instrumentos(id),
      recebido_em TEXT NOT NULL, previsao_entrega TEXT NOT NULL DEFAULT '',
      solicitacao TEXT NOT NULL, diagnostico TEXT NOT NULL DEFAULT '',
      condicao_entrada TEXT NOT NULL DEFAULT '', acessorios TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL, aprovacao TEXT NOT NULL, desconto REAL NOT NULL DEFAULT 0,
      valor_recebido REAL NOT NULL DEFAULT 0, forma_pagamento TEXT NOT NULL DEFAULT 'Não informado',
      garantia_dias INTEGER NOT NULL DEFAULT 0, observacoes TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS servicos_os (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ordem_id TEXT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
      posicao INTEGER NOT NULL, descricao TEXT NOT NULL, quantidade REAL NOT NULL, preco_unitario REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS fotos_os (
      id TEXT PRIMARY KEY,
      ordem_id TEXT REFERENCES ordens_servico(id) ON DELETE SET NULL,
      nome TEXT NOT NULL, mime TEXT NOT NULL, imagem BLOB NOT NULL, criado_em TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY CHECK (id = 1), nome TEXT NOT NULL,
      telefone TEXT NOT NULL DEFAULT '', endereco TEXT NOT NULL DEFAULT '',
      documento TEXT NOT NULL DEFAULT '', termos TEXT NOT NULL DEFAULT '', garantia INTEGER NOT NULL DEFAULT 90
    );
    CREATE INDEX IF NOT EXISTS idx_instrumentos_cliente ON instrumentos(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_ordens_cliente ON ordens_servico(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_ordens_instrumento ON ordens_servico(instrumento_id);
    CREATE INDEX IF NOT EXISTS idx_servicos_ordem ON servicos_os(ordem_id, posicao);
    CREATE INDEX IF NOT EXISTS idx_fotos_ordem ON fotos_os(ordem_id);
    INSERT OR IGNORE INTO metadata (chave, valor) VALUES ('revision', '0'), ('seq', '0');
    INSERT OR IGNORE INTO configuracoes (id, nome, termos, garantia)
      VALUES (1, 'Bueno Luthier', '${TERMOS_PADRAO.replaceAll("'", "''")}', 90);
  `);
}

module.exports = {inicializarSchema};
