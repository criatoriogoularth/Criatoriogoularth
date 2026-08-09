// routes/torneios.js
//
// CRUD de Copas/Torneios do site público. Cada linha é uma etapa
// dentro de uma categoria (ex: categoria "Copa ABCO Livre Adulto
// 2026", etapa "1ª Etapa - 18/04/2026"). "visivel" permite esconder
// sem excluir — igual ao padrão já usado em aves.status_site.
const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// ---------- PÚBLICO (sem login) ----------

// Lista só etapas visíveis, agrupáveis no front por "categoria".
router.get('/publico', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, categoria, etapa, data, ordem
     FROM site_torneios
     WHERE usuario_id = $1 AND visivel = true
     ORDER BY categoria, ordem, data`,
    [1]
  );
  res.json(rows);
}));

// Detalhe de UMA etapa (com os resultados) — só se estiver visível.
router.get('/publico/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, categoria, etapa, data, resultados
     FROM site_torneios
     WHERE id = $1 AND usuario_id = $2 AND visivel = true`,
    [req.params.id, 1]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Etapa não encontrada ou não está visível.' });
  res.json(rows[0]);
}));

// ---------- ADMIN (logado) ----------
router.use(authMiddleware);

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM site_torneios WHERE usuario_id = $1 ORDER BY categoria, ordem, id`,
    [req.user.id]
  );
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM site_torneios WHERE id = $1 AND usuario_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Etapa não encontrada.' });
  res.json(rows[0]);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { categoria, etapa, data, visivel, ordem, resultados } = req.body || {};

  if (!categoria || !categoria.trim()) {
    return res.status(400).json({ error: 'Categoria é obrigatória.' });
  }
  if (!etapa || !etapa.trim()) {
    return res.status(400).json({ error: 'Nome da etapa é obrigatório.' });
  }

  const { rows } = await pool.query(
    `INSERT INTO site_torneios (usuario_id, categoria, etapa, data, visivel, ordem, resultados)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      req.user.id,
      categoria.trim(),
      etapa.trim(),
      data || null,
      visivel !== false,
      ordem || 0,
      JSON.stringify(Array.isArray(resultados) ? resultados : [])
    ]
  );
  res.status(201).json(rows[0]);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { categoria, etapa, data, visivel, ordem, resultados } = req.body || {};

  const { rows } = await pool.query(
    `UPDATE site_torneios SET
       categoria = COALESCE($1, categoria),
       etapa = COALESCE($2, etapa),
       data = $3,
       visivel = COALESCE($4, visivel),
       ordem = COALESCE($5, ordem),
       resultados = COALESCE($6, resultados),
       atualizado_em = NOW()
     WHERE id = $7 AND usuario_id = $8 RETURNING *`,
    [
      categoria ? categoria.trim() : null,
      etapa ? etapa.trim() : null,
      data || null,
      typeof visivel === 'boolean' ? visivel : null,
      typeof ordem === 'number' ? ordem : null,
      Array.isArray(resultados) ? JSON.stringify(resultados) : null,
      req.params.id,
      req.user.id
    ]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Etapa não encontrada.' });
  res.json(rows[0]);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM site_torneios WHERE id = $1 AND usuario_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Etapa não encontrada.' });
  res.json({ ok: true });
}));

// Reordenação em lote (drag & drop no admin) — recebe [{id, ordem}, ...]
router.put('/reordenar/lote', asyncHandler(async (req, res) => {
  const { itens } = req.body || {};
  if (!Array.isArray(itens)) {
    return res.status(400).json({ error: 'Campo "itens" deve ser uma lista.' });
  }

  await Promise.all(itens.map(item =>
    pool.query(
      'UPDATE site_torneios SET ordem = $1 WHERE id = $2 AND usuario_id = $3',
      [item.ordem, item.id, req.user.id]
    )
  ));

  res.json({ ok: true });
}));

module.exports = router;
