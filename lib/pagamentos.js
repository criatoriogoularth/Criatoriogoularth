// lib/pagamentos.js — registra um pagamento e renova o plano do cliente.
// Usado pelo dono (pagamento recebido por Pix/boleto fora do sistema) e pelo webhook do Asaas.
// É IDEMPOTENTE: o mesmo pagamento (origem + referência externa) só conta uma vez.
const master = require('../db/masterPool');
const tenants = require('../db/tenants');
const { getPlano } = require('./planos');
const { enviarEmail, moldura } = require('./email');

async function registrarPagamento({ tenantId, planoId, meses = 12, valorCentavos = null, origem = 'manual', ref = null, obs = null, por = null }) {
  const plano = await getPlano(planoId);
  if (!plano || plano.id === 'teste') { const e = new Error('Plano inválido para pagamento.'); e.status = 400; throw e; }
  meses = Math.max(1, Math.min(60, Number(meses) || 12));

  const cx = await master.connect();
  let fim;
  try {
    await cx.query('BEGIN');
    const { rows: [t] } = await cx.query('SELECT id, status, plano_fim FROM tenants WHERE id = $1 FOR UPDATE', [tenantId]);
    if (!t) { await cx.query('ROLLBACK'); const e = new Error('Cliente não encontrado.'); e.status = 404; throw e; }

    const ins = await cx.query(
      `INSERT INTO pagamentos (tenant_id, plano_id, valor_centavos, meses, origem, referencia_externa, observacao, registrado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING id`,
      [tenantId, plano.id, valorCentavos, meses, origem, ref, obs, por]);
    if (!ins.rows.length) { await cx.query('ROLLBACK'); return { duplicado: true }; }

    // renova a partir do vencimento atual (se ainda em dia) ou de hoje — ninguém perde dias pagando adiantado
    const { rows: [r] } = await cx.query(
      `UPDATE tenants SET plano_id = $2, status = 'ativo',
              plano_fim = (CASE WHEN status = 'ativo' AND plano_fim IS NOT NULL AND plano_fim > NOW() THEN plano_fim ELSE NOW() END)
                          + ($3 || ' months')::interval
       WHERE id = $1 RETURNING plano_fim`, [tenantId, plano.id, String(meses)]);
    fim = r.plano_fim;
    await cx.query('COMMIT');
  } catch (e) { await cx.query('ROLLBACK').catch(() => {}); throw e; } finally { cx.release(); }

  tenants.invalidar();

  // avisa o cliente (não atrapalha se o e-mail falhar)
  try {
    const { rows } = await master.query('SELECT nome, email FROM contas WHERE tenant_id = $1 AND role = \'cliente\' ORDER BY id LIMIT 1', [tenantId]);
    if (rows[0]) {
      const data = new Date(fim).toLocaleDateString('pt-BR');
      const texto = `Recebemos o seu pagamento. O plano ${plano.nome} está ativo até ${data}. Obrigado!`;
      await enviarEmail({ para: rows[0].email, assunto: 'Pagamento recebido — Aviari', texto: `Olá, ${rows[0].nome}!\n\n${texto}`,
        html: moldura('Pagamento recebido', [`Olá, ${rows[0].nome}!`, texto]) });
    }
  } catch (e) { /* segue */ }
  return { duplicado: false, planoFim: fim };
}

module.exports = { registrarPagamento };
