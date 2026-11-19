// routes/interno.js — uso do servidor web (Caddy), nunca do público.
//
// GET /api/interno/dominio-permitido?domain=fulano.aviari.com.br
//   O Caddy pergunta isto ANTES de pedir um certificado HTTPS ("on_demand_tls ask"). Só devolve 200
//   para endereços que existem de verdade: o app, subdomínios de criatórios cadastrados e domínios
//   próprios ATIVADOS pelo dono. Qualquer outro nome → 404 (senão qualquer um poderia gastar o limite
//   de certificados apontando domínios aleatórios para o seu servidor).
// Só aceita pedidos vindos do próprio servidor (127.0.0.1).
const express = require('express');
const tenants = require('../db/tenants');
const asyncHandler = require('../middleware/asyncHandler');
const { slugDoHost } = require('../middleware/tenant');

const router = express.Router();
const BASE = (process.env.BASE_DOMAIN || '').toLowerCase();

const local = (ip) => ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

router.get('/dominio-permitido', asyncHandler(async (req, res) => {
  if (!local(req.socket.remoteAddress) || !local(req.ip)) return res.status(404).end();
  const d = String(req.query.domain || '').toLowerCase().trim();
  if (!d || d.length > 253) return res.status(404).end();

  if (BASE && (d === BASE || d === 'app.' + BASE || d === 'www.' + BASE)) return res.status(200).end();
  const slug = slugDoHost(d);
  if (slug && (await tenants.porSlug(slug))) return res.status(200).end();
  if (await tenants.porDominio(d)) return res.status(200).end();
  res.status(404).end();
}));

module.exports = router;
