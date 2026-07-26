// routes/reproducoes.js
//
// O front-end trabalha com um objeto "achatado" (femeaNome, femeaAnilha,
// totalOvos, filhotes, status...), igual fazia no localStorage. Aqui a
// gente guarda status numa coluna própria e o resto inteiro dentro de
// "dados" (JSONB) — e devolve tudo já achatado de volta, pra não precisar
// mexer no HTML.
const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(authMiddleware);

function achatar(row) {
  return { id: row.id, status: row.status, criadoEm: row.criado_em, ...row.dados };
}

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM reproducoes WHERE usuario_id = $1 ORDER BY id DESC',
    [req.user.id]
  );
  res.json(rows.map(achatar));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM reproducoes WHERE id = $1 AND usuario_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Registro não encontrado.' });
  res.json(achatar(rows[0]));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { status, ...dados } = req.body || {};
  const { rows } = await pool.query(
    'INSERT INTO reproducoes (usuario_id, dados, status) VALUES ($1,$2,$3) RETURNING *',
    [req.user.id, JSON.stringify(dados), status || 'Ativo']
  );
  res.status(201).json(achatar(rows[0]));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { status, ...dadosNovos } = req.body || {};

  const atual = await pool.query(
    'SELECT * FROM reproducoes WHERE id=$1 AND usuario_id=$2',
    [req.params.id, req.user.id]
  );
  if (!atual.rows[0]) return res.status(404).json({ error: 'Registro não encontrado.' });

  const dadosMesclados = { ...atual.rows[0].dados, ...dadosNovos };

  const { rows } = await pool.query(
    'UPDATE reproducoes SET dados = $1, status = COALESCE($2, status) WHERE id=$3 AND usuario_id=$4 RETURNING *',
    [JSON.stringify(dadosMesclados), status, req.params.id, req.user.id]
  );
  res.json(achatar(rows[0]));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM reproducoes WHERE id=$1 AND usuario_id=$2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Registro não encontrado.' });
  res.json({ ok: true });
}));

module.exports = router;
