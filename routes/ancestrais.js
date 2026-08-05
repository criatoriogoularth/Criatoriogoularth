// routes/ancestrais.js
const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(authMiddleware);

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM ancestrais WHERE usuario_id = $1 ORDER BY nome',
    [req.user.id]
  );
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM ancestrais WHERE id = $1 AND usuario_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ancestral não encontrado.' });
  res.json(rows[0]);
}));

router.post('/', asyncHandler(async (req, res) => {
  // ===== CORREÇÃO: ADICIONADO CAMPO 'raca' =====
  const { nome, anilha, sexo, especie, raca, observacao } = req.body || {};
  
  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }
  if (!sexo) {
    return res.status(400).json({ error: 'Sexo é obrigatório.' });
  }

  const dup = await pool.query(
    'SELECT id FROM ancestrais WHERE nome = $1 AND usuario_id = $2',
    [nome.trim(), req.user.id]
  );
  if (dup.rows.length > 0) {
    return res.status(409).json({ error: 'Este ancestral já está cadastrado.' });
  }

  // ===== CORREÇÃO: ADICIONADO 'raca' NA LISTA DE COLUNAS E VALORES =====
  const { rows } = await pool.query(
    `INSERT INTO ancestrais (usuario_id, nome, anilha, sexo, especie, raca, observacao)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [req.user.id, nome.trim(), anilha || '', sexo, especie || '', raca || '', observacao || '']
  );
  res.status(201).json(rows[0]);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  // ===== CORREÇÃO: ADICIONADO CAMPO 'raca' =====
  const { nome, anilha, sexo, especie, raca, observacao } = req.body || {};
  
  if (nome && nome.trim()) {
    const dup = await pool.query(
      'SELECT id FROM ancestrais WHERE nome = $1 AND usuario_id = $2 AND id != $3',
      [nome.trim(), req.user.id, req.params.id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Este ancestral já está cadastrado.' });
    }
  }

  // ===== CORREÇÃO: ADICIONADO 'raca' NA ATUALIZAÇÃO =====
  const { rows } = await pool.query(
    `UPDATE ancestrais SET
       nome = COALESCE($1, nome),
       anilha = COALESCE($2, anilha),
       sexo = COALESCE($3, sexo),
       especie = COALESCE($4, especie),
       raca = COALESCE($5, raca),
       observacao = COALESCE($6, observacao),
       atualizado_em = NOW()
     WHERE id = $7 AND usuario_id = $8 RETURNING *`,
    [nome ? nome.trim() : null, anilha || '', sexo, especie || '', raca || '', observacao || '', req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ancestral não encontrado.' });
  res.json(rows[0]);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM ancestrais WHERE id = $1 AND usuario_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ancestral não encontrado.' });
  res.json({ ok: true });
}));

module.exports = router;