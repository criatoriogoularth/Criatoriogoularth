// lib/sanitizar.js — neutraliza texto digitado por criadores e visitantes ANTES de guardar.
//
// Por quê: os nomes, textos e links de cada criatório aparecem nas páginas do site (e no painel).
// Se alguém digitar  <img src=x onerror=...>  ou  " onmouseover="...  isso viraria código rodando
// no navegador de quem visita. Aqui o texto é limpo na entrada, para que NUNCA exista código no banco.
//
// Regras para texto comum:
//   • tira  <  >  \  e crase (nome de ave não precisa deles);
//   • aspas viram aspas "de impressão" (” e ’): continuam bonitas, mas não fecham atributo HTML nem texto JS;
//   • tira caracteres de controle (menos quebra de linha e tab).
// Exceções que passam inteiras: imagem em data:image/(png|jpeg|gif|webp);base64 e links http(s) bem formados.
// Links "javascript:", "vbscript:" e data: que não seja imagem são descartados.

const DATA_IMG = /^data:image\/(?:png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/;
const DATA_PDF = /^data:application\/pdf;base64,[A-Za-z0-9+/=\s]+$/;
const URL_OK = /^https?:\/\/[^\s"'<>`\\]{1,2000}$/i;
const URL_PERIGOSA = /^\s*(?:javascript|vbscript|data|file)\s*:/i;

function limparTexto(s) {
  return String(s)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>\\`]/g, '')
    .replace(/"/g, '\u201D')
    .replace(/'/g, '\u2019');
}

function limparString(s) {
  if (DATA_IMG.test(s) || DATA_PDF.test(s)) return s;     // arquivos já validados à parte
  if (URL_OK.test(s)) return s;
  if (URL_PERIGOSA.test(s)) return '';
  return limparTexto(s);
}

// Percorre objetos e listas (JSON de configuração, reprodução...) limpando todo texto.
function limparProfundo(v, profundidade = 0) {
  if (profundidade > 12) return null;                      // estrutura absurda: descarta
  if (typeof v === 'string') return limparString(v);
  if (Array.isArray(v)) return v.map((x) => limparProfundo(x, profundidade + 1));
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      out[limparTexto(k)] = limparProfundo(x, profundidade + 1);
    }
    return out;
  }
  return v;   // número, booleano, null
}

module.exports = { limparTexto, limparString, limparProfundo };
