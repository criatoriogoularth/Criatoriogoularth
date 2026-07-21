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

// Colunas jsonb: precisam ir como STRING JSON pro pg, senão o driver trata
// arrays/objetos JS como literal de array do Postgres (`{"..","..",}`) em
// vez de JSON, e o Postgres rejeita com "invalid input syntax for type json".
const CAMPOS_JSON = new Set(['ancestrais', 'historico']);

// Colunas boolean NOT NULL DEFAULT false: se o campo não vier no body,
// `?? null` mandava NULL explícito pro INSERT, o que sobrescreve o
// DEFAULT da coluna e quebra a constraint NOT NULL. Aqui garantimos que
// ausência de valor vira `false`, não `null`.
const CAMPOS_BOOL = new Set(['filhote', 'no_site']);

// Colunas date: o formulário manda "" quando o campo fica vazio, e o
// Postgres não aceita "" como data (só uma data real ou NULL).
const CAMPOS_DATA = new Set(['data_nasc']);

function normalizarValor(campo, valor) {
  if (CAMPOS_JSON.has(campo)) {
    // undefined/null -> respeita o default da coluna ('[]') em vez de gravar NULL
    if (valor === undefined || valor === null) return '[]';
    return JSON.stringify(valor);
  }
  if (CAMPOS_BOOL.has(campo)) {
    if (valor === undefined || valor === null) return false;
    return Boolean(valor);
  }
  if (CAMPOS_DATA.has(campo)) {
    if (valor === undefined || valor === null || valor === '') return null;
    return valor;
  }
  return valor ?? null;
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

  const cols = ['usuario_id', ...CAMPOS];
  const valores = [req.user.id, ...CAMPOS.map(c => normalizarValor(c, body[c]))];
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
  const valores = camposPresentes.map(c => normalizarValor(c, body[c]));
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
            avo_materno AS "avoMaterno", avo_materna AS "avoMaterna"
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
