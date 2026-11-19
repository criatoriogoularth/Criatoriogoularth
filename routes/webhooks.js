// routes/webhooks.js — recebe o aviso de pagamento do Asaas (asaas.com).
// Configure no Asaas: Integrações → Webhooks → URL  https://SEU-ENDERECO/api/webhooks/asaas
//   • "Token de autenticação" = o mesmo valor de ASAAS_WEBHOOK_TOKEN no .env
//   • ao criar a cobrança, preencha "Referência externa" com:   aviari:ID_DO_CLIENTE:PLANO:MESES
//     (o ID do cliente aparece no painel do dono; ex.: aviari:12:completo:12)
// ⚠️ Escrito conforme a documentação do Asaas, mas NÃO testado contra o Asaas de verdade — faça um pagamento de teste no sandbox deles antes de confiar.
const crypto = require('crypto');
const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { registrarPagamento } = require('../lib/pagamentos');

const router = express.Router();

function tokenOk(recebido) {
  const esperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!esperado || !recebido) return false;
  const a = Buffer.from(String(recebido)), b = Buffer.from(esperado);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

router.post('/asaas', asyncHandler(async (req, res) => {
  if (!tokenOk(req.headers['asaas-access-token'])) return res.status(401).json({ error: 'Token inválido.' });
  const { event, payment } = req.body || {};
  if (!['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event) || !payment) return res.json({ ok: true, ignorado: true });

  const m = /^aviari:(\d{1,9}):([a-z_]{3,30}):(\d{1,2})$/.exec(String(payment.externalReference || ''));
  if (!m) return res.json({ ok: true, ignorado: true, motivo: 'referencia_externa_desconhecida' });
  try {
    const r = await registrarPagamento({
      tenantId: Number(m[1]), planoId: m[2], meses: Number(m[3]),
      valorCentavos: payment.value != null ? Math.round(Number(payment.value) * 100) : null,
      origem: 'asaas', ref: String(payment.id || ''), obs: event
    });
    res.json({ ok: true, ...r });
  } catch (e) {
    if (e.status) return res.json({ ok: true, ignorado: true, motivo: e.message });   // não fica reenviando um pedido inválido
    throw e;
  }
}));

module.exports = router;
