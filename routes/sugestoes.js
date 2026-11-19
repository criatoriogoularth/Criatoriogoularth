// routes/sugestoes.js — botão "Enviar sugestão ou problema" dentro do sistema.
const express = require('express');
const master = require('../db/masterPool');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { limparTexto } = require('../lib/sanitizar');

const router = express.Router();
router.use(authMiddleware.livre);

const porConta = new Map();
router.post('/', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const texto = limparTexto(String(b.texto || '').trim().slice(0, 4000));
  if (texto.length < 3) return res.status(400).json({ error: 'Escreva a sua mensagem.' });
  const tipo = ['problema', 'sugestao', 'duvida'].includes(b.tipo) ? b.tipo : 'sugestao';

  const hoje = new Date().toISOString().slice(0, 10);
  const k = req.user.conta + ':' + hoje;
  const n = (porConta.get(k) || 0) + 1;
  if (n > 30) return res.status(429).json({ error: 'Muitas mensagens hoje. Tente amanhã.' });
  porConta.set(k, n);

  await master.query('INSERT INTO sugestoes (tenant_id, tipo, pagina, texto) VALUES ($1,$2,$3,$4)',
    [req.user.tenant || null, tipo, limparTexto(String(b.pagina || '').slice(0, 200)), texto]);
  res.status(201).json({ ok: true });
}));

module.exports = router;
