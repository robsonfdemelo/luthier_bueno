'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const html = fs.readFileSync(path.join(root,'public','index.html'),'utf8');
const pdf = fs.readFileSync(path.join(root,'public','os-pdf.js'),'utf8');
const pages = fs.readFileSync(path.join(root,'server','controllers','pages.controller.js'),'utf8');

test('botão Baixar PDF atende listagem, detalhe e confirmação após salvar',()=>{
  assert.ok(app.includes('async function baixarPdfOrdem(o)'));
  assert.ok(app.includes("data-download-pdf=\""));
  assert.ok(app.includes("t.hasAttribute('data-download-pdf')"));
  assert.ok(app.includes("settings:data.settings"));
  assert.ok(app.includes('order:o'));
});

test('gerador de PDF é carregado antes do app e permitido no MVC',()=>{
  assert.ok(html.indexOf('src="/os-pdf.js"') < html.indexOf('src="/app.js"'));
  assert.match(pages, /'\/os-pdf\.js':\['os-pdf\.js'/);
  assert.match(pdf, /window\.BuenoPdf = Object\.freeze\(\{baixar, gerarPdf\}\)/);
});

test('PDF direto gera uma única página A4 com duas vias e nome da O.S., sem rodapé do Chrome',()=>{
  assert.ok(pdf.includes("`${name} - Bueno Luthier.pdf`"));
  assert.ok(pdf.includes("drawCopy(ctx, 0, 'VIA DA OFICINA'"));
  assert.ok(pdf.includes("drawCopy(ctx, HALF_HEIGHT, 'VIA DO CLIENTE'"));
  assert.ok(pdf.includes('/MediaBox [0 0'));
  assert.ok(pdf.includes("/Count 1"));
  assert.ok(pdf.includes('application/pdf'));
  assert.ok(pdf.includes('Endereco:')===false);
  assert.ok(!pdf.includes('luthierbueno-production.up.railway.app'));
  assert.ok(!pdf.includes('1/1'));
});

test('impressão do navegador sugere número da OS e restaura título do site',()=>{
  assert.ok(app.includes('tituloAntesImpressao=document.title'));
  assert.ok(app.includes("document.title=String(o.number"));
  assert.ok(app.includes('document.title=tituloAntesImpressao'));
  assert.ok(app.includes('print-sheet'));
});
