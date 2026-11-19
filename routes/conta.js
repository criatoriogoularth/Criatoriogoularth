// routes/conta.js — situação do plano do próprio cliente (funciona mesmo com acesso bloqueado).
const express = require('express');
const master = require('../db/masterPool');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { todosPlanos, limiteGaleria, limites } = require('../lib/planos');

const router = express.Router();
router.use(authMiddleware.livre);

router.get('/', asyncHandler(async (req, res) => {
  if (!req.tenant) return res.status(403).json({ error: 'Sem criatório.' });
  const planos = [...(await todosPlanos()).values()].filter((p) => p.ativo && p.id !== 'teste');
  const atual = req.plano;
  const a = req.acesso;
  res.json({
    criatorio: { nome: req.tenant.nome, slug: req.tenant.slug, dominioProprio: req.tenant.dominio_proprio, dominioAtivo: req.tenant.dominio_ativo },
    plano: { id: atual.id, nome: atual.nome, gerenciador: atual.gerenciador, site: atual.site, imprimir: atual.imprimir,
             dominioProprio: atual.dominio_proprio, limiteFotosAve: atual.limite_fotos_ave, limiteGaleria: limiteGaleria(atual, req.tenant) },
    limites: limites(atual, req.tenant),
    acesso: { ativo: a.ativo, motivo: a.motivo || null, tipo: a.tipo || null, somenteLeitura: !!a.somenteLeitura,
              diasRestantes: a.diasRestantes == null ? null : a.diasRestantes, fim: a.fim || null },
    planosDisponiveis: planos.map((p) => ({ id: p.id, nome: p.nome, descricao: p.descricao, precoAnualCentavos: p.preco_anual_centavos,
      gerenciador: p.gerenciador, site: p.site, dominioProprio: p.dominio_proprio, imprimir: p.imprimir }))
  });
}));

// Registra o interesse em contratar (o pagamento automático entra em outra etapa).
router.post('/interesse', asyncHandler(async (req, res) => {
  const plano = String((req.body && req.body.plano_id) || '').slice(0, 30);
  await master.query(`INSERT INTO sugestoes (tenant_id, tipo, pagina, texto) VALUES ($1, 'compra', 'plano.html', $2)`,
    [req.tenant.id, `Quer contratar o plano "${plano}".`]);
  res.status(201).json({ ok: true });
}));

module.exports = router;
