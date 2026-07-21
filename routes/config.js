// routes/config.js
//
// Substitui as antigas chaves do localStorage (site_personalizacao,
// site_especies, site_noticias, site_fotos, site_videos, site_banner,
// site_conteudo) por um par chave/valor guardado no Postgres.
//
// Front-end antigo:
//   localStorage.setItem('site_noticias', JSON.stringify(noticias))
// Front-end novo:
//   await fetch('/api/config/site_noticias', { method:'PUT', ... body: JSON.stringify({ valor: noticias }) })

const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Chaves permitidas — evita que a rota vire um key-value store arbitrário
const CHAVES_VALIDAS = new Set([
  'site_personalizacao', 'site_especies', 'site_noticias',
  'site_fotos', 'site_videos', 'site_banner', 'site_conteudo',
  'especies_aves', 'dados_criatorio', 'cert_config'
]);

function validarChave(req, res, next) {
  if (!CHAVES_VALIDAS.has(req.params.chave)) {
    return res.status(400).json({ error: 'Chave de configuração desconhecida.' });
  }
  next();
}

// ---------- LEITURA PÚBLICA (o site do criatório precisa ler sem login) ----------
router.get('/publico/:chave', validarChave, async (req, res) => {
  // Sistema é single-user: sempre lê do usuário id=1 (o admin/dono do criatório)
  const { rows } = await pool.query(
    'SELECT valor FROM site_config WHERE usuario_id = $1 AND chave = $2',
    [1, req.params.chave]
  );
  res.json(rows[0] ? rows[0].valor : null);
});

// ---------- ESCRITA (só o admin logado) ----------
router.put('/:chave', authMiddleware, validarChave, async (req, res) => {
  const { valor } = req.body || {};
  if (valor === undefined) return res.status(400).json({ error: 'Campo "valor" é obrigatório.' });

  const { rows } = await pool.query(
    `INSERT INTO site_config (usuario_id, chave, valor, atualizado_em)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (usuario_id, chave)
     DO UPDATE SET valor = $3, atualizado_em = NOW()
     RETURNING valor`,
    [req.user.id, req.params.chave, JSON.stringify(valor)]
  );
  res.json(rows[0].valor);
});

module.exports = router;
