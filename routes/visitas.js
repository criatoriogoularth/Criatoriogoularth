// routes/visitas.js
//
// Contador de visitantes do site público. POST é aberto (o site
// público não tem login) — cada visita vira uma linha na tabela.
// O site-buttons.js só chama isso 1x por sessão de navegador
// (sessionStorage), então "visita" aqui ~ "sessão de alguém no
// site", não uma linha por página vista.
const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// ---------- REGISTRAR (público) ----------
router.post('/', asyncHandler(async (req, res) => {
  const pagina = (req.body && req.body.pagina) ? String(req.body.pagina).slice(0, 100) : null;

  // Sistema é single-user: sempre grava pro usuário id=1, mesmo padrão
  // já usado em routes/config.js pra tudo que é dado público do site.
  await pool.query(
    'INSERT INTO site_visitas (usuario_id, pagina) VALUES ($1, $2)',
    [1, pagina]
  );
  res.status(201).json({ ok: true });
}));

// ---------- ESTATÍSTICAS (só admin logado) ----------
router.get('/stats', authMiddleware, asyncHandler(async (req, res) => {
  const [hoje, total, ultimos7] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total FROM site_visitas
       WHERE usuario_id = $1 AND data = CURRENT_DATE`,
      [1]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total FROM site_visitas WHERE usuario_id = $1`,
      [1]
    ),
    pool.query(
      `SELECT data, COUNT(*)::int AS total
       FROM site_visitas
       WHERE usuario_id = $1 AND data >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY data ORDER BY data`,
      [1]
    )
  ]);

  res.json({
    hoje: hoje.rows[0].total,
    total: total.rows[0].total,
    ultimos7: ultimos7.rows
  });
}));

module.exports = router;
