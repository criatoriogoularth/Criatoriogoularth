// routes/anilhas.js
const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(authMiddleware); // todas as rotas de anilhas exigem login

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM anilhas WHERE usuario_id = $1 ORDER BY id',
    [req.user.id]
  );
  res.json(rows);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { cor, tipo, numero, dimensao, observacao, data_cadastro, disponivel, ativo } = req.body || {};
  if (!numero) return res.status(400).json({ error: 'Número da anilha é obrigatório.' });

  const dup = await pool.query(
    'SELECT id FROM anilhas WHERE numero = $1 AND usuario_id = $2',
    [numero, req.user.id]
  );
  if (dup.rows.length > 0) {
    return res.status(409).json({ error: 'Esta anilha já está cadastrada.' });
  }

  const { rows } = await pool.query(
    `INSERT INTO anilhas (usuario_id, cor, tipo, numero, dimensao, observacao, data_cadastro, disponivel, ativo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [req.user.id, cor, tipo, numero, dimensao, observacao, data_cadastro || null, disponivel || 'Sim', ativo || 'Sim']
  );
  res.status(201).json(rows[0]);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { cor, tipo, numero, dimensao, observacao, data_cadastro, disponivel, ativo } = req.body || {};

  if (numero) {
    const dup = await pool.query(
      'SELECT id FROM anilhas WHERE numero = $1 AND usuario_id = $2 AND id != $3',
      [numero, req.user.id, req.params.id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Esta anilha já está cadastrada.' });
    }
  }

  const { rows } = await pool.query(
    `UPDATE anilhas SET
       cor = COALESCE($1, cor),
       tipo = COALESCE($2, tipo),
       numero = COALESCE($3, numero),
       dimensao = COALESCE($4, dimensao),
       observacao = COALESCE($5, observacao),
       data_cadastro = COALESCE($6, data_cadastro),
       disponivel = COALESCE($7, disponivel),
       ativo = COALESCE($8, ativo)
     WHERE id = $9 AND usuario_id = $10 RETURNING *`,
    [cor, tipo, numero, dimensao, observacao, data_cadastro, disponivel, ativo, req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Anilha não encontrada.' });
  res.json(rows[0]);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM anilhas WHERE id=$1 AND usuario_id=$2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Anilha não encontrada.' });
  res.json({ ok: true });
}));

module.exports = router;
