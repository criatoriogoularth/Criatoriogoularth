// routes/aves.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const Genealogia = require('../public/genealogia.js');
const { limparTexto, limparString, limparProfundo } = require('../lib/sanitizar');

const router = express.Router();

const CAMPOS = [
  'nome', 'anilha', 'sexo', 'especie', 'raca', 'data_nasc', 'situacao', 'tipo',
  'manejo', 'gaiola', 'mutacao', 'pai', 'anilha_pai', 'mae', 'anilha_mae',
  'avo_paterno', 'avo_paterna', 'avo_materno', 'avo_materna', 'filhote',
  'no_site', 'categoria_site', 'status_site', 'ancestrais', 'historico',
  'fotos', 'video_url', 'cig_numero', 'cig_arquivo', 'sexagem_arquivo', 'mostrar_cig', 'mostrar_sexagem'
];

const MAX_FOTOS = 6;

// Colunas pesadas (imagens em base64): NÃO vão nas listagens, só na ficha da ave.
const COLS_LEVES = `id, usuario_id, nome, anilha, sexo, especie, raca, data_nasc, situacao, tipo, manejo, gaiola,
  mutacao, pai, anilha_pai, mae, anilha_mae, avo_paterno, avo_paterna, avo_materno, avo_materna, filhote, no_site,
  categoria_site, status_site, ancestrais, historico, video_url, cig_numero, mostrar_cig, mostrar_sexagem, criado_em, atualizado_em,
  (jsonb_array_length(COALESCE(fotos, '[]'::jsonb)) > 0) AS tem_fotos,
  (cig_arquivo IS NOT NULL AND cig_arquivo <> '') AS tem_cig_arquivo,
  (sexagem_arquivo IS NOT NULL AND sexagem_arquivo <> '') AS tem_sexagem_arquivo`;

// (As colunas de mídia agora fazem parte de db/tenant-schema.sql, aplicado por cliente.)

// data:image/jpeg;base64,... -> { mime, bin } (ou null)
function decodificarDataUrl(du) {
  if (typeof du !== 'string') return null;
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.+)$/is.exec(du);
  if (!m) return null;
  return { mime: m[1].toLowerCase(), bin: Buffer.from(m[2], 'base64') };
}

function arquivoOk(du, max = 6000000) {
  if (typeof du !== 'string' || du.length > max * 1.4) return false;
  const d = decodificarDataUrl(du);
  return !!d && ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(d.mime);
}

// Valida o que veio de mídia no corpo; devolve mensagem de erro ou null.
// Fotos por ave que o plano permite. Quem já tem mais fotos (ex.: conta antiga) não perde nenhuma:
// o limite vale para ADICIONAR, nunca para o que já existe.
async function limiteFotosAve(req, aveId) {
  const base = (req.plano && req.plano.limite_fotos_ave) || MAX_FOTOS;
  if (!aveId) return base;
  const { rows } = await req.db.query(
    'SELECT jsonb_array_length(fotos) AS n FROM aves WHERE id = $1 AND usuario_id = $2', [aveId, req.user.id]);
  return Math.max(base, (rows[0] && rows[0].n) || 0);
}
function contarFotos(body) {
  let l = body.fotos;
  if (typeof l === 'string') { try { l = JSON.parse(l); } catch { l = []; } }
  return Array.isArray(l) ? l.length : 0;
}

function validarMidia(body) {
  const v = body.video_url;
  if (typeof v === 'string' && v.trim() !== '' && !/^https?:\/\//i.test(v.trim())) {
    return 'O link do vídeo precisa começar com http:// ou https://';
  }
  for (const c of ['cig_arquivo', 'sexagem_arquivo']) {
    const x = body[c];
    if (typeof x === 'string' && x.trim() !== '' && !arquivoOk(x)) {
      return 'Arquivo inválido ou grande demais. Use imagem (JPG/PNG) ou PDF de até 4 MB.';
    }
  }
  return null;
}

// Colunas JSONB que guardam um ARRAY
const CAMPOS_JSON_ARRAY = new Set(['ancestrais', 'historico', 'fotos']);
const CAMPOS_BOOLEAN = new Set(['filhote', 'no_site', 'mostrar_cig', 'mostrar_sexagem']);
const CAMPOS_DATE = new Set(['data_nasc']);
const CAMPOS_NUMERIC = new Set([]); // se tiver algum campo numérico no futuro

/**
 * LIMPA E PREPARA QUALQUER VALOR PARA O BANCO
 * - Strings vazias → null
 * - undefined → null
 * - Arrays → JSON.stringify (para JSONB)
 * - Booleanos → mantém como boolean
 * - Datas vazias → null
 * - null/undefined com fallback para arrays vazios
 */
function prepararValor(campo, valor, maxFotos = MAX_FOTOS) {
  // 1. TRATA UNDEFINED E STRING VAZIA
  if (valor === undefined) {
    return getDefaultForField(campo);
  }
  
  if (typeof valor === 'string' && valor.trim() === '') {
    // Se for string vazia, verifica se é um campo que precisa de valor especial
    if (CAMPOS_JSON_ARRAY.has(campo)) {
      return JSON.stringify([]);
    }
    if (CAMPOS_DATE.has(campo)) {
      return null; // data vazia → null
    }
    if (CAMPOS_BOOLEAN.has(campo)) {
      return false; // boolean vazio → false
    }
    return null; // outros campos string vazia → null
  }

  // 1b. FOTOS: só imagens válidas, no máximo MAX_FOTOS
  if (campo === 'fotos') {
    let lista = valor;
    if (typeof lista === 'string') { try { lista = JSON.parse(lista); } catch { lista = []; } }
    if (!Array.isArray(lista)) lista = [];
    const ok = lista.filter((f) => arquivoOk(f, 3000000) && !f.startsWith('data:application/pdf')).slice(0, maxFotos);
    return JSON.stringify(ok);
  }

  // 2. TRATA CAMPOS JSON (arrays)
  if (CAMPOS_JSON_ARRAY.has(campo)) {
    if (valor === null) return JSON.stringify([]);
    if (Array.isArray(valor)) return JSON.stringify(limparProfundo(valor));
    if (typeof valor === 'string') {
      try {
        // Se veio como string JSON, faz parse e serializa de novo
        const parsed = JSON.parse(valor);
        return JSON.stringify(Array.isArray(parsed) ? limparProfundo(parsed) : []);
      } catch {
        return JSON.stringify([]);
      }
    }
    return JSON.stringify([]);
  }

  // 3. TRATA CAMPOS BOOLEANOS
  if (CAMPOS_BOOLEAN.has(campo)) {
    if (typeof valor === 'boolean') return valor;
    if (valor === 'true' || valor === '1' || valor === 1) return true;
    if (valor === 'false' || valor === '0' || valor === 0) return false;
    return false; // padrão
  }

  // 4. TRATA CAMPOS DE DATA
  if (CAMPOS_DATE.has(campo)) {
    if (valor === null) return null;
    if (typeof valor === 'string' && valor.trim() === '') return null;
    // Tenta criar uma data válida
    const date = new Date(valor);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }
    return null;
  }

  // 5. TRATA CAMPOS NUMÉRICOS (se houver)
  if (CAMPOS_NUMERIC.has(campo)) {
    const num = Number(valor);
    return isNaN(num) ? null : num;
  }

  // 6. QUALQUER OUTRO CAMPO - retorna o valor limpo
  if (typeof valor === 'string') {
    return limparString(valor.trim()) || null;
  }
  return valor;
}

function getDefaultForField(campo) {
  if (CAMPOS_JSON_ARRAY.has(campo)) return JSON.stringify([]);
  if (CAMPOS_BOOLEAN.has(campo)) return false;
  if (CAMPOS_DATE.has(campo)) return null;
  return null;
}

function linhaParaAve(row) {
  return row;
}

// ---------- ROTAS PRIVADAS ----------

router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { rows } = await req.db.query(
    `SELECT ${COLS_LEVES} FROM aves WHERE usuario_id = $1 ORDER BY id`,
    [req.user.id]
  );
  res.json(rows.map(linhaParaAve));
}));

router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { rows } = await req.db.query(
    'SELECT * FROM aves WHERE id = $1 AND usuario_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ave não encontrada.' });
  res.json(linhaParaAve(rows[0]));
}));

// Limite de aves do plano (vazio = sem limite). Devolve a mensagem de erro ou null.
async function erroLimiteAves(req, quantas = 1) {
  const max = req.plano && req.plano.limite_aves;
  if (max == null) return null;
  const { rows } = await req.db.query('SELECT COUNT(*)::int AS n FROM aves WHERE usuario_id = $1', [req.user.id]);
  return rows[0].n + quantas > max ? `Seu plano permite até ${max} aves (você tem ${rows[0].n}).` : null;
}

// Cadastro de várias aves de uma vez (usado pela importação de planilha). Cada linha é conferida
// sozinha: as boas entram, as ruins voltam com o motivo — uma linha errada não derruba as outras.
router.post('/lote', authMiddleware, asyncHandler(async (req, res) => {
  const lista = req.body && req.body.aves;
  if (!Array.isArray(lista) || lista.length === 0) return res.status(400).json({ error: 'Envie a lista de aves.' });
  if (lista.length > 300) return res.status(400).json({ error: 'Envie no máximo 300 aves por vez.' });

  const maxAves = req.plano && req.plano.limite_aves;
  let restante = Infinity;
  if (maxAves != null) {
    const { rows } = await req.db.query('SELECT COUNT(*)::int AS n FROM aves WHERE usuario_id = $1', [req.user.id]);
    restante = Math.max(0, maxAves - rows[0].n);
  }
  const maxFotos = await limiteFotosAve(req, null);
  const { rows: existentes } = await req.db.query('SELECT anilha FROM aves WHERE usuario_id = $1', [req.user.id]);
  const anilhasUsadas = new Set(existentes.map((r) => String(r.anilha || '').trim().toLowerCase()));

  const criadas = [], ignoradas = [];
  for (let i = 0; i < lista.length; i++) {
    const b = limparProfundo(lista[i] || {});
    const linha = i + 1;
    const nome = String(b.nome || '').trim(), anilha = String(b.anilha || '').trim();
    if (!nome) { ignoradas.push({ linha, motivo: 'sem nome' }); continue; }
    if (!anilha) { ignoradas.push({ linha, nome, motivo: 'sem anilha' }); continue; }
    if (anilhasUsadas.has(anilha.toLowerCase())) { ignoradas.push({ linha, nome, motivo: 'anilha já cadastrada' }); continue; }
    if (criadas.length >= restante) { ignoradas.push({ linha, nome, motivo: `limite de ${maxAves} aves do plano` }); continue; }
    b.nome = nome; b.anilha = anilha;
    delete b.fotos; delete b.cig_arquivo; delete b.sexagem_arquivo;      // planilha não traz arquivos
    try {
      const cols = ['usuario_id', ...CAMPOS];
      const valores = [req.user.id, ...CAMPOS.map((c) => prepararValor(c, b[c], maxFotos))];
      const { rows } = await req.db.query(
        `INSERT INTO aves (${cols.join(', ')}) VALUES (${valores.map((_, k) => `$${k + 1}`).join(', ')}) RETURNING id`, valores);
      anilhasUsadas.add(anilha.toLowerCase());
      criadas.push({ linha, id: rows[0].id });
    } catch (e) { ignoradas.push({ linha, nome, motivo: 'dados inválidos' }); }
  }
  res.status(201).json({ criadas: criadas.length, ignoradas });
}));

router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  const body = req.body || {};

  const limite = await erroLimiteAves(req);
  if (limite) return res.status(403).json({ error: limite, codigo: 'LIMITE_AVES' });
  
  // Validação básica
  if (!body.nome || (typeof body.nome === 'string' && body.nome.trim() === '')) {
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }
  if (!body.anilha || (typeof body.anilha === 'string' && body.anilha.trim() === '')) {
    return res.status(400).json({ error: 'Anilha é obrigatória.' });
  }

  const erroMidia = validarMidia(body);
  if (erroMidia) return res.status(400).json({ error: erroMidia });

  const maxFotos = await limiteFotosAve(req, null);
  if (contarFotos(body) > maxFotos) {
    return res.status(400).json({ error: `Seu plano permite até ${maxFotos} fotos por ave.` });
  }

  // Impede duplicar anilha
  const dup = await req.db.query(
    'SELECT id FROM aves WHERE anilha = $1 AND usuario_id = $2',
    [body.anilha.trim(), req.user.id]
  );
  if (dup.rows.length > 0) {
    return res.status(409).json({ error: 'Esta anilha já está sendo usada por outra ave.' });
  }

  // Prepara todos os campos com a função de limpeza
  const cols = ['usuario_id', ...CAMPOS];
  const valores = [
    req.user.id,
    ...CAMPOS.map(c => prepararValor(c, body[c], maxFotos))
  ];
  const placeholders = valores.map((_, i) => `$${i + 1}`).join(', ');

  const { rows } = await req.db.query(
    `INSERT INTO aves (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    valores
  );
  res.status(201).json(linhaParaAve(rows[0]));
}));

router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const body = req.body || {};

  const erroMidia = validarMidia(body);
  if (erroMidia) return res.status(400).json({ error: erroMidia });

  const maxFotos = await limiteFotosAve(req, req.params.id);
  if (body.fotos !== undefined && contarFotos(body) > maxFotos) {
    return res.status(400).json({ error: `Seu plano permite até ${maxFotos} fotos por ave.` });
  }

  // Verifica duplicidade se estiver mudando a anilha
  if (body.anilha && typeof body.anilha === 'string' && body.anilha.trim() !== '') {
    const dup = await req.db.query(
      'SELECT id FROM aves WHERE anilha = $1 AND usuario_id = $2 AND id != $3',
      [body.anilha.trim(), req.user.id, req.params.id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Esta anilha já está sendo usada por outra ave.' });
    }
  }

  // Filtra apenas campos que foram enviados
  const camposEnviados = CAMPOS.filter(c => body[c] !== undefined);
  if (camposEnviados.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
  }

  // Prepara cada campo com a função de limpeza
  const sets = camposEnviados.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const valores = camposEnviados.map(c => prepararValor(c, body[c], maxFotos));
  valores.push(req.params.id, req.user.id);

  const { rows } = await req.db.query(
    `UPDATE aves SET ${sets}, atualizado_em = NOW()
     WHERE id = $${valores.length - 1} AND usuario_id = $${valores.length}
     RETURNING *`,
    valores
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ave não encontrada.' });
  res.json(linhaParaAve(rows[0]));
}));

router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { rows } = await req.db.query(
    'DELETE FROM aves WHERE id = $1 AND usuario_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ave não encontrada.' });
  res.json({ ok: true });
}));

// ---------- ROTAS PÚBLICAS ----------

router.get('/publico/site', asyncHandler(async (req, res) => {
  const { rows } = await req.db.query(
    `SELECT id, nome, anilha, sexo, especie, raca,
            data_nasc AS "dataNasc", pai, mae,
            categoria_site AS "categoria", status_site AS "status",
            CASE WHEN mostrar_cig THEN cig_numero END AS "cigNumero",
            (jsonb_array_length(COALESCE(fotos, '[]'::jsonb)) > 0) AS "temFoto",
            (video_url IS NOT NULL AND video_url <> '') AS "temVideo",
            (mostrar_cig AND ((cig_numero IS NOT NULL AND cig_numero <> '') OR (cig_arquivo IS NOT NULL AND cig_arquivo <> ''))) AS "temCig",
            (mostrar_sexagem AND sexagem_arquivo IS NOT NULL AND sexagem_arquivo <> '') AS "temSexagem",
            EXTRACT(EPOCH FROM atualizado_em)::bigint AS "v"
     FROM aves WHERE no_site = true ORDER BY especie, nome`
  );
  res.json(rows.map((r) => ({ ...r, v: Number(r.v) })));
}));

// Dados de mídia de UMA ave (foto, vídeo, CIG, laudo) — usado pela janelinha do site.
router.get('/publico/midia/:id', asyncHandler(async (req, res) => {
  if (!/^\d{1,9}$/.test(req.params.id)) return res.status(404).json({ error: 'Ave não encontrada.' });
  const { rows } = await req.db.query(
    `SELECT id, nome, anilha, sexo, fotos, video_url, cig_numero, cig_arquivo, sexagem_arquivo, mostrar_cig, mostrar_sexagem,
            EXTRACT(EPOCH FROM atualizado_em)::bigint AS v
     FROM aves WHERE id = $1 AND no_site = true`,
    [req.params.id]
  );
  const a = rows[0];
  if (!a) return res.status(404).json({ error: 'Ave não encontrada.' });
  const tipo = (du) => { const d = decodificarDataUrl(du); return d ? (d.mime === 'application/pdf' ? 'pdf' : 'imagem') : null; };
  res.json({
    id: a.id, nome: a.nome, anilha: a.anilha, sexo: a.sexo,
    numFotos: Array.isArray(a.fotos) ? a.fotos.length : 0,
    videoUrl: a.video_url,
    cigNumero: a.mostrar_cig ? a.cig_numero : null,
    cigTipo: a.mostrar_cig && a.cig_arquivo ? tipo(a.cig_arquivo) : null,
    sexagemTipo: a.mostrar_sexagem && a.sexagem_arquivo ? tipo(a.sexagem_arquivo) : null,
    v: Number(a.v)
  });
}));

// Entrega o arquivo em si (foto/CIG/laudo) como imagem/PDF de verdade: /publico/arquivo/ID/foto/0
router.get('/publico/arquivo/:id/:tipo/:i?', asyncHandler(async (req, res) => {
  const naoAchou = () => res.status(404).json({ error: 'Arquivo não encontrado.' });
  if (!/^\d{1,9}$/.test(req.params.id)) return naoAchou();
  const col = { foto: 'fotos', cig: 'cig_arquivo', sexagem: 'sexagem_arquivo' }[req.params.tipo];
  if (!col) return naoAchou();
  const { rows } = await req.db.query(`SELECT ${col} AS c, mostrar_cig, mostrar_sexagem FROM aves WHERE id = $1 AND no_site = true`, [req.params.id]);
  if (!rows[0] || !rows[0].c) return naoAchou();
  // Documento só sai se o criador marcou "mostrar no site" nesta ave
  if ((req.params.tipo === 'cig' && !rows[0].mostrar_cig) || (req.params.tipo === 'sexagem' && !rows[0].mostrar_sexagem)) return naoAchou();
  let du = rows[0].c;
  if (req.params.tipo === 'foto') {
    const i = /^\d+$/.test(req.params.i || '') ? parseInt(req.params.i, 10) : 0;
    du = Array.isArray(du) ? du[i] : null;
  }
  const d = decodificarDataUrl(du);
  if (!d) return naoAchou();
  res.set({ 'Content-Type': d.mime, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
  res.send(d.bin);
}));

router.get('/publico/certificado/:id', asyncHandler(async (req, res) => {
  const aveRes = await req.db.query(
    `SELECT id, usuario_id, nome, anilha, sexo, especie, raca,
            data_nasc AS "dataNasc", pai, anilha_pai AS "anilhaPai",
            mae, anilha_mae AS "anilhaMae",
            avo_paterno AS "avoPaterno", avo_paterna AS "avoPaterna",
            avo_materno AS "avoMaterno", avo_materna AS "avoMaterna",
            ancestrais
     FROM aves WHERE id = $1 AND no_site = true`,
    [req.params.id]
  );
  const ave = aveRes.rows[0];
  if (!ave) return res.status(404).json({ error: 'Certificado não disponível.' });

  // CORREÇÃO (árvore incompleta): a árvore agora é montada AQUI, subindo pelos pais
  // cadastrados do MESMO criador, até a 5ª geração — a mesma função (public/genealogia.js)
  // usada pelo painel, pelo crachá e pelo simulador. Antes só buscava pai/mãe por nome
  // (em qualquer criador!) e olhava no máximo até os avós.
  const [todasRes, tabelaRes] = await Promise.all([
    req.db.query(
      `SELECT id, nome, anilha, pai, anilha_pai AS "anilhaPai", mae, anilha_mae AS "anilhaMae",
              avo_paterno AS "avoPaterno", avo_paterna AS "avoPaterna",
              avo_materno AS "avoMaterno", avo_materna AS "avoMaterna", ancestrais
       FROM aves WHERE usuario_id = $1`,
      [ave.usuario_id]
    ),
    req.db.query('SELECT nome, anilha FROM ancestrais WHERE usuario_id = $1', [ave.usuario_id])
  ]);
  const arvore = Genealogia.montar(ave, todasRes.rows, { maxGen: 5, ancestraisTabela: tabelaRes.rows });

  const { usuario_id, ...publico } = ave;
  // paiEncontrado/maeEncontrada continuam sendo enviados (compatibilidade com versões antigas da página)
  const achado = (c) => (arvore[c] ? { nome: arvore[c].nome, anilha: arvore[c].anilha || '' } : null);
  res.json({
    ...publico,
    arvore: Genealogia.listar(arvore, 1),
    paiEncontrado: achado('pai'),
    maeEncontrada: achado('mae')
  });
}));

module.exports = router;