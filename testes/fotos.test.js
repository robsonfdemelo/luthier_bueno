'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {mkdtempSync, rmSync} = require('node:fs');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {criarBanco} = require('../server/banco');
const PNG_MINIMO = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8ZB6sAAAAASUVORK5CYII=';
function nova() {
 const dir=mkdtempSync(path.join(tmpdir(),'bueno-fotos-'));const arquivo=path.join(dir,'banco.sqlite');
 return {banco:criarBanco(arquivo),arquivo,fechar(){this.banco.fechar();rmSync(dir,{recursive:true,force:true})}};
}
function estado(photos=[]){return {version:3,seq:1,
 customers:[{id:'c',name:'Maria',phone:'62999999999',email:'',document:'',notes:''}],
 instruments:[{id:'i',customerId:'c',type:'Violão',brand:'Giannini',model:'',serial:'',color:'',condition:'Risco na lateral',notes:''}],
 orders:[{id:'o',number:'OS-00001',createdAt:'2026-11-07T13:00:00.000Z',updatedAt:'2026-11-07T13:00:00.000Z',customerId:'c',instrumentId:'i',receivedDate:'2026-11-07',dueDate:'',complaint:'Regular braço',diagnosis:'',condition:'Risco',accessories:'Capa',status:'Recebido',approval:'Pendente',items:[{description:'Regulagem',quantity:1,price:120}],photos,paid:0,paymentMethod:'Não informado',warrantyDays:90,notes:''}],settings:{name:'Bueno Luthier',phone:'',address:'',document:'',terms:'',warranty:90}}}
test('upload de foto, vinculação à O.S. e persistência após reabrir SQLite',()=>{
 const f=nova();try{
  const foto=f.banco.subirFoto({name:'recebimento.png',mime:'image/png',data:PNG_MINIMO});
  const res=f.banco.salvar({revision:0,state:estado([foto])});
  assert.equal(res.state.orders[0].photos.length,1);
  assert.equal(res.state.orders[0].photos[0].name,'recebimento.png');
  assert.equal(Buffer.from(f.banco.obterFoto(foto.id).bytes).toString('base64'),PNG_MINIMO);
  f.banco.fechar();f.banco=criarBanco(f.arquivo);
  assert.equal(f.banco.recuperar().state.orders[0].photos[0].id,foto.id);
 }finally{f.fechar()}
});
test('backup exporta a imagem e restauração traz fotos e OS de volta',()=>{
 const f=nova();const destino=nova();try{
  const photo=f.banco.subirFoto({name:'foto.png',mime:'image/png',data:PNG_MINIMO});
  f.banco.salvar({revision:0,state:estado([photo])});
  const backup=f.banco.exportarBackup();
  assert.equal(backup.photos[0].data,PNG_MINIMO);
  const restore=destino.banco.restaurar({revision:0,state:backup,photos:backup.photos});
  assert.equal(restore.state.orders[0].photos[0].id,photo.id);
  assert.equal(Buffer.from(destino.banco.obterFoto(photo.id).bytes).toString('base64'),PNG_MINIMO);
 }finally{f.fechar();destino.fechar()}
});
test('compatibilidade com backups antigos sem fotos',()=>{
 const f=nova();try{
  const before=estado();delete before.orders[0].photos;
  assert.equal(f.banco.restaurar({revision:0,state:before,photos:[]}).state.orders[0].photos.length,0);
 }finally{f.fechar()}
});
test('não aceita imagem que não é PNG, referência inexistente ou foto repetida',()=>{
 const f=nova();try{
  assert.throws(()=>f.banco.subirFoto({name:'golpe.png',mime:'image/png',data:Buffer.from('não é png').toString('base64')}),/não corresponde/);
  assert.throws(()=>f.banco.salvar({revision:0,state:estado([{id:'inexistente'}])}),/não encontrada/);
  assert.equal(f.banco.recuperar().revision,0);
  const foto=f.banco.subirFoto({name:'f.png',mime:'image/png',data:PNG_MINIMO});
  assert.throws(()=>f.banco.salvar({revision:0,state:estado([foto,foto])}),/duplicado/);
 }finally{f.fechar()}
});
