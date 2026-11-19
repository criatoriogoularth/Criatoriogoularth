// lib/avisos.js — e-mails de aviso de teste/plano perto de vencer. Cada aviso é mandado UMA vez
// (a tabela avisos_enviados impede repetir, mesmo com mais de um servidor ou reinício).
const master = require('../db/masterPool');
const { estadoAcesso } = require('./planos');
const { enviarEmail, modelos } = require('./email');

const DIA = 24 * 60 * 60 * 1000;
const base = () => (process.env.APP_URL || '').replace(/\/$/, '');

// Decide qual aviso (se algum) este cliente deve receber hoje.
function avisoDe(t, agora) {
  const a = estadoAcesso(t, agora);
  const dias = (fim) => Math.ceil((new Date(fim) - agora) / DIA);
  if (t.status === 'teste' && t.trial_fim) {
    const d = dias(t.trial_fim);
    if (a.ativo && [5, 2, 1].includes(d)) return { tipo: `teste_${d}d`, ref: new Date(t.trial_fim).toISOString(),
      assunto: `Seu teste grátis termina em ${d} dia${d > 1 ? 's' : ''}`,
      texto: `Seu teste grátis do Aviari termina em ${d} dia${d > 1 ? 's' : ''}. Escolha um plano para continuar usando o sistema e manter o seu site no ar. Seus dados ficam guardados.` };
    if (!a.ativo && agora - new Date(t.trial_fim) < 4 * DIA) return { tipo: 'teste_acabou', ref: new Date(t.trial_fim).toISOString(),
      assunto: 'Seu teste grátis terminou',
      texto: 'Seu teste grátis terminou e o acesso foi pausado. Seus dados estão guardados e seguros: escolha um plano e tudo volta ao normal.' };
  }
  if (t.status === 'ativo' && t.plano_fim) {
    const d = dias(t.plano_fim);
    if (d > 0 && [15, 7, 1].includes(d)) return { tipo: `plano_${d}d`, ref: new Date(t.plano_fim).toISOString(),
      assunto: `Seu plano vence em ${d} dia${d > 1 ? 's' : ''}`,
      texto: `Seu plano vence em ${d} dia${d > 1 ? 's' : ''}. Renove para não ficar sem acesso nem tirar o site do ar.` };
    if (a.somenteLeitura) return { tipo: 'plano_vencido', ref: new Date(t.plano_fim).toISOString(),
      assunto: 'Seu plano venceu',
      texto: `Seu plano venceu. Você ainda pode consultar seus dados por mais ${a.diasRestantes} dia(s); depois disso o acesso é pausado. Renove para continuar.` };
  }
  return null;
}

async function rodarAvisos(agora = new Date()) {
  const { rows } = await master.query(
    `SELECT t.id, t.slug, t.nome, t.status, t.trial_fim, t.plano_fim, t.carencia_dias, c.nome AS nome_conta, c.email
       FROM tenants t JOIN contas c ON c.tenant_id = t.id AND c.role = 'cliente'
      WHERE t.status IN ('teste', 'ativo')`);
  let enviados = 0;
  for (const t of rows) {
    const aviso = avisoDe(t, agora);
    if (!aviso) continue;
    const novo = await master.query(
      'INSERT INTO avisos_enviados (tenant_id, tipo, referencia) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id', [t.id, aviso.tipo, aviso.ref]);
    if (!novo.rows.length) continue;                        // já mandado
    const m = modelos.aviso(t.nome_conta, t.nome, aviso, base() + '/plano.html');
    const r = await enviarEmail({ para: t.email, ...m });
    if (!r.ok && !r.modoTeste) await master.query('DELETE FROM avisos_enviados WHERE id = $1', [novo.rows[0].id]);   // tenta de novo depois
    else enviados++;
  }
  return enviados;
}

module.exports = { rodarAvisos, avisoDe };
