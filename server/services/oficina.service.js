'use strict';

const {randomUUID} = require('node:crypto');
const {validarEstado, validarStatus, ErroValidacao} = require('../validators/estado.validator');
const {lerBase64} = require('../validators/foto.validator');
const MAX_FOTOS_BACKUP = 5000;
const ID_VALIDO = /^[A-Za-z0-9_-]{1,80}$/;

function criarOficinaService(repositorio) {
  function recuperar() { return repositorio.recuperar(); }

  function salvar(payload) {
    return repositorio.salvar(validarEstado(payload));
  }

  function alterarStatus({id, revision, status}) {
    if (typeof id !== 'string' || !ID_VALIDO.test(id)) {
      throw new ErroValidacao('Identificador da O.S. inválido.');
    }
    if (!Number.isSafeInteger(revision) || revision < 0 || revision > 1000000000) {
      throw new ErroValidacao('Revisão inválida.');
    }
    return repositorio.alterarStatus({id,revision,status:validarStatus(status)});
  }

  function subirFoto({name, mime, data} = {}) {
    const nome = String(name ?? 'Foto do instrumento').trim().slice(0, 150) || 'Foto do instrumento';
    const bytes = lerBase64(data, mime);
    return repositorio.subirFoto({id:randomUUID(),name:nome,mime,bytes});
  }

  function obterFoto(id) {
    if (!ID_VALIDO.test(String(id))) return null;
    return repositorio.obterFoto(id);
  }

  function exportarBackup() {
    const {state} = repositorio.recuperar();
    return {
      ...state,
      photos:repositorio.listarFotosBackup().map(f=>({id:f.id,name:f.name,mime:f.mime,data:Buffer.from(f.bytes).toString('base64')})),
      exportedAt:new Date().toISOString(),
    };
  }

  function restaurar(payload) {
    const validado = validarEstado(payload);
    const fotosOriginais = payload.photos ?? [];
    if (!Array.isArray(fotosOriginais) || fotosOriginais.length > MAX_FOTOS_BACKUP) {
      throw new ErroValidacao('O backup possui fotos demais.');
    }
    const vistos = new Set();
    const fotos = fotosOriginais.map(f => {
      if (!f || typeof f !== 'object' || !ID_VALIDO.test(f.id || '') || vistos.has(f.id)) {
        throw new ErroValidacao('ID de foto duplicado ou inválido no backup.');
      }
      vistos.add(f.id);
      return {
        id:f.id,
        name:String(f.name ?? 'Foto do instrumento').trim().slice(0,150),
        mime:f.mime,
        bytes:lerBase64(f.data,f.mime),
      };
    });
    const referencias = validado.state.orders.flatMap(o=>o.photos.map(f=>f.id));
    if (referencias.some(id=>!vistos.has(id))) {
      throw new ErroValidacao('Backup sem os arquivos de algumas fotos da OS.');
    }
    return repositorio.salvar(validado,fotos);
  }

  function fechar() {repositorio.fechar();}
  return {recuperar,salvar,alterarStatus,subirFoto,obterFoto,exportarBackup,restaurar,fechar};
}

module.exports = {criarOficinaService};
