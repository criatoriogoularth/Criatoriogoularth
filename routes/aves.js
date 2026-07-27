// routes/aves.js
const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const CAMPOS = [
  'nome', 'anilha', 'sexo', 'especie', 'raca', 'data_nasc', 'situacao', 'tipo',
  'manejo', 'gaiola', 'mutacao', 'pai', 'anilha_pai', 'mae', 'anilha_mae',
  'avo_paterno', 'avo_paterna', 'avo_materno', 'avo_materna', 'filhote',
  'no_site', 'categoria_site', 'status_site', 'ancestrais', 'historico'
];

// Colunas JSONB que guardam um ARRAY (ancestrais, historico). O driver
// pg, quando recebe um array JS puro, serializa como array NATIVO do
// Postgres (formato "{a,b,c}") em vez de JSON ("[a,b,c]") — quebra a
// coluna jsonb. Por isso essas precisam ser serializadas manualmente
// com JSON.stringify antes de entrar na query.
const CAMPOS_JSON_ARRAY = new Set(['ancestrais', 'historico']);

function prepararValor(campo, valor) {
  if (valor === undefined) return null;
  if (CAMPOS_JSON_ARRAY.has(campo) && valor !== null) {
    return JSON.stringify(valor);
  }
  // Garante que booleanos sejam enviados corretamente
  if (typeof valor === 'boolean') return valor;
  return valor;
}

function linhaParaAve(row) {
  return row; // node-pg já entrega JSONB como objeto/array JS
}

// ---------- ROTAS PRIVADAS (exigem login) ----------

router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM aves WHERE usuario_id = $1 ORDER BY id',
    [req.user.id]
  );
  res.json(rows.map(linhaParaAve));
}));

router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM aves WHERE id = $1 AND usuario_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ave não encontrada.' });
  res.json(linhaParaAve(rows[0]));
}));

router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  const body = req.body || {};
  if (!body.nome || !body.anilha) {
    return res.status(400).json({ error: 'Nome e anilha são obrigatórios.' });
  }

  // Impede duplicar anilha para o mesmo usuário
  const dup = await pool.query(
    'SELECT id FROM aves WHERE anilha = $1 AND usuario_id = $2',
    [body.anilha, req.user.id]
  );
  if (dup.rows.length > 0) {
    return res.status(409).json({ error: 'Esta anilha já está sendo usada por outra ave.' });
  }

  // Valores padrão para campos obrigatórios
  const valoresParaInserir = {
    ...body,
    no_site: body.no_site !== undefined ? body.no_site : false,
    ativo: body.ativo !== undefined ? body.ativo : true
  };

  const cols = ['usuario_id', ...CAMPOS];
  const valores = [req.user.id, ...CAMPOS.map(c => prepararValor(c, valoresParaInserir[c] ?? null))];
  const placeholders = valores.map((_, i) => `$${i + 1}`).join(', ');

  const { rows } = await pool.query(
    `INSERT INTO aves (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    valores
  );
  res.status(201).json(linhaParaAve(rows[0]));
}));

router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const body = req.body || {};

  if (body.anilha) {
    const dup = await pool.query(
      'SELECT id FROM aves WHERE anilha = $1 AND usuario_id = $2 AND id != $3',
      [body.anilha, req.user.id, req.params.id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Esta anilha já está sendo usada por outra ave.' });
    }
  }

  const camposPresentes = CAMPOS.filter(c => body[c] !== undefined);
  if (camposPresentes.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
  }

  const sets = camposPresentes.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const valores = camposPresentes.map(c => prepararValor(c, body[c]));
  valores.push(req.params.id, req.user.id);

  const { rows } = await pool.query(
    `UPDATE aves SET ${sets}, atualizado_em = NOW()
     WHERE id = $${valores.length - 1} AND usuario_id = $${valores.length}
     RETURNING *`,
    valores
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ave não encontrada.' });
  res.json(linhaParaAve(rows[0]));
}));

router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM aves WHERE id = $1 AND usuario_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ave não encontrada.' });
  res.json({ ok: true });
}));

// ---------- ROTA PÚBLICA (site do criatório, sem login) ----------
// Só devolve o que foi marcado explicitamente para aparecer no site.
router.get('/publico/site', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, nome, anilha, sexo, especie, raca,
            data_nasc AS "dataNasc", pai, mae,
            categoria_site AS "categoria", status_site AS "status"
     FROM aves WHERE no_site = true ORDER BY especie, nome`
  );
  res.json(rows);
}));

// Certificado público de uma ave específica. Só funciona se a ave estiver
// marcada para aparecer no site (no_site = true) — assim não expõe o
// plantel privado inteiro, só resolve os avós dessa ave em particular
// (a versão antiga mandava a tabela "aves" completa pro navegador do
// visitante fazer essa busca, o que vazava todo o plantel privado).
router.get('/publico/certificado/:id', asyncHandler(async (req, res) => {
  const aveRes = await pool.query(
    `SELECT id, nome, anilha, sexo, especie, raca,
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

  async function buscarPorNome(nome) {
    if (!nome || nome === ave.nome) return null;
    const r = await pool.query(
      `SELECT nome, anilha, pai, anilha_pai AS "anilhaPai", mae, anilha_mae AS "anilhaMae"
       FROM aves WHERE nome = $1 LIMIT 1`,
      [nome]
    );
    return r.rows[0] || null;
  }

  const paiEncontrado = await buscarPorNome(ave.pai);
  const maeEncontrada = await buscarPorNome(ave.mae);

  res.json({ ...ave, paiEncontrado, maeEncontrada });
}));

module.exports = router;