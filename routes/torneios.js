// routes/torneios.js
//
// CRUD de Copas/Torneios do site público. Cada linha é uma etapa
// dentro de uma categoria (ex: categoria "Copa ABCO Livre Adulto
// 2026", etapa "1ª Etapa - 18/04/2026"). "visivel" permite esconder
// sem excluir — igual ao padrão já usado em aves.status_site.
//
// CORREÇÃO/MUDANÇA DE MODELO: antes cada etapa guardava um array
// "resultados" (pos/ave/anilha/tempo/pontos) que o admin preenchia
// linha a linha no sistema. Isso não era o que o usuário queria — ele
// já publica a classificação pronta em imagem/PDF (como faz no blog
// atual) e só precisa que o link abra essa imagem/PDF. Por isso a
// etapa agora guarda só "arquivo_url" (a imagem ou PDF, em base64 ou
// URL externa) e "arquivo_tipo" ('imagem' ou 'pdf'), igual ao padrão
// já usado em site_banners e site_especies.
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

// Detalhe de UMA etapa (com o arquivo) — só se estiver visível.
router.get('/publico/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, categoria, etapa, data, arquivo_url AS "arquivoUrl", arquivo_tipo AS "arquivoTipo"
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
    `SELECT id, categoria, etapa, data, visivel, ordem,
            arquivo_url AS "arquivoUrl", arquivo_tipo AS "arquivoTipo"
     FROM site_torneios WHERE usuario_id = $1 ORDER BY categoria, ordem, id`,
    [req.user.id]
  );
  res.json(rows);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, categoria, etapa, data, visivel, ordem,
            arquivo_url AS "arquivoUrl", arquivo_tipo AS "arquivoTipo"
     FROM site_torneios WHERE id = $1 AND usuario_id = $2`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Etapa não encontrada.' });
  res.json(rows[0]);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { categoria, etapa, data, visivel, ordem, arquivoUrl, arquivoTipo } = req.body || {};

  if (!categoria || !categoria.trim()) {
    return res.status(400).json({ error: 'Categoria é obrigatória.' });
  }
  if (!etapa || !etapa.trim()) {
    return res.status(400).json({ error: 'Nome do link é obrigatório.' });
  }
  if (!arquivoUrl) {
    return res.status(400).json({ error: 'Suba a imagem ou o PDF do resultado.' });
  }

  const { rows } = await pool.query(
    `INSERT INTO site_torneios (usuario_id, categoria, etapa, data, visivel, ordem, arquivo_url, arquivo_tipo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, categoria, etapa, data, visivel, ordem,
               arquivo_url AS "arquivoUrl", arquivo_tipo AS "arquivoTipo"`,
    [
      req.user.id,
      categoria.trim(),
      etapa.trim(),
      data || null,
      visivel !== false,
      ordem || 0,
      arquivoUrl,
      arquivoTipo === 'pdf' ? 'pdf' : 'imagem'
    ]
  );
  res.status(201).json(rows[0]);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { categoria, etapa, data, visivel, ordem, arquivoUrl, arquivoTipo } = req.body || {};

  const { rows } = await pool.query(
    `UPDATE site_torneios SET
       categoria = COALESCE($1, categoria),
       etapa = COALESCE($2, etapa),
       data = $3,
       visivel = COALESCE($4, visivel),
       ordem = COALESCE($5, ordem),
       arquivo_url = COALESCE($6, arquivo_url),
       arquivo_tipo = COALESCE($7, arquivo_tipo),
       atualizado_em = NOW()
     WHERE id = $8 AND usuario_id = $9
     RETURNING id, categoria, etapa, data, visivel, ordem,
               arquivo_url AS "arquivoUrl", arquivo_tipo AS "arquivoTipo"`,
    [
      categoria ? categoria.trim() : null,
      etapa ? etapa.trim() : null,
      data || null,
      typeof visivel === 'boolean' ? visivel : null,
      typeof ordem === 'number' ? ordem : null,
      arquivoUrl || null,
      arquivoUrl ? (arquivoTipo === 'pdf' ? 'pdf' : 'imagem') : null,
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
