// routes/ancestrais.js
const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(authMiddleware); // todas as rotas exigem login

// GET - Listar todos os ancestrais do usuário
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM ancestrais WHERE usuario_id = $1 ORDER BY nome',
    [req.user.id]
  );
  res.json(rows);
}));

// GET - Buscar ancestral por ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM ancestrais WHERE id = $1 AND usuario_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ancestral não encontrado.' });
  res.json(rows[0]);
}));

// POST - Criar novo ancestral
router.post('/', asyncHandler(async (req, res) => {
  const { nome, anilha, sexo, especie, observacao } = req.body || {};
  
  if (!nome || (typeof nome === 'string' && nome.trim() === '')) {
    return res.status(400).json({ error: 'Nome é obrigatório.' });
  }
  if (!sexo) {
    return res.status(400).json({ error: 'Sexo é obrigatório.' });
  }

  // Verifica se já existe um ancestral com esse nome
  const dup = await pool.query(
    'SELECT id FROM ancestrais WHERE nome = $1 AND usuario_id = $2',
    [nome.trim(), req.user.id]
  );
  if (dup.rows.length > 0) {
    return res.status(409).json({ error: 'Este ancestral já está cadastrado.' });
  }

  const { rows } = await pool.query(
    `INSERT INTO ancestrais (usuario_id, nome, anilha, sexo, especie, observacao)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user.id, nome.trim(), anilha || '', sexo, especie || '', observacao || '']
  );
  res.status(201).json(rows[0]);
}));

// PUT - Atualizar ancestral
router.put('/:id', asyncHandler(async (req, res) => {
  const { nome, anilha, sexo, especie, observacao } = req.body || {};
  
  if (nome && typeof nome === 'string' && nome.trim() !== '') {
    const dup = await pool.query(
      'SELECT id FROM ancestrais WHERE nome = $1 AND usuario_id = $2 AND id != $3',
      [nome.trim(), req.user.id, req.params.id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Este ancestral já está cadastrado.' });
    }
  }

  const { rows } = await pool.query(
    `UPDATE ancestrais SET
       nome = COALESCE($1, nome),
       anilha = COALESCE($2, anilha),
       sexo = COALESCE($3, sexo),
       especie = COALESCE($4, especie),
       observacao = COALESCE($5, observacao),
       atualizado_em = NOW()
     WHERE id = $6 AND usuario_id = $7 RETURNING *`,
    [nome ? nome.trim() : null, anilha || '', sexo, especie || '', observacao || '', req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ancestral não encontrado.' });
  res.json(rows[0]);
}));

// DELETE - Excluir ancestral
router.delete('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM ancestrais WHERE id = $1 AND usuario_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Ancestral não encontrado.' });
  res.json({ ok: true });
}));

module.exports = router;