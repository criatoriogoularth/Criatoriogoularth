// lib/planos.js — regras de plano: o que cada cliente pode usar e até quando.
const master = require('../db/masterPool');

const DIA = 24 * 60 * 60 * 1000;
let cache = { exp: 0, mapa: new Map() };

async function todosPlanos() {
  if (cache.exp < Date.now()) {
    const { rows } = await master.query('SELECT * FROM planos ORDER BY ordem, id');
    cache = { exp: Date.now() + 60 * 1000, mapa: new Map(rows.map((p) => [p.id, p])) };
  }
  return cache.mapa;
}
async function getPlano(id) { return (await todosPlanos()).get(id) || null; }
function limparCachePlanos() { cache.exp = 0; }

// Situação de acesso do cliente agora.
//  ativo:false           -> bloqueado (só vê a tela de planos)
//  somenteLeitura:true   -> carência após vencer: consulta, mas não grava
function estadoAcesso(t, agora = new Date()) {
  if (t.status === 'suspenso') return { ativo: false, motivo: 'suspenso' };

  if (t.status === 'teste') {
    const fim = t.trial_fim ? new Date(t.trial_fim) : null;
    if (!fim || agora > fim) return { ativo: false, motivo: 'teste_acabou' };
    return { ativo: true, tipo: 'teste', fim, diasRestantes: Math.max(0, Math.ceil((fim - agora) / DIA)) };
  }

  if (t.status === 'ativo') {
    const fim = t.plano_fim ? new Date(t.plano_fim) : null;
    if (!fim || agora <= fim) {
      return { ativo: true, tipo: 'ativo', fim, diasRestantes: fim ? Math.ceil((fim - agora) / DIA) : null };
    }
    const limite = new Date(fim.getTime() + (t.carencia_dias || 0) * DIA);
    if (agora <= limite) {
      return { ativo: true, somenteLeitura: true, tipo: 'carencia', fim: limite, diasRestantes: Math.ceil((limite - agora) / DIA) };
    }
    return { ativo: false, motivo: 'plano_vencido' };
  }

  return { ativo: false, motivo: 'vencido' };
}

// Limite de fotos da galeria do site: 50 no subdomínio, 80 com domínio próprio (+ pacotes extras).
function limiteGaleria(plano, tenant) {
  const base = tenant.dominio_ativo && plano.dominio_proprio
    ? plano.limite_galeria_dominio
    : plano.limite_galeria_subdominio;
  return base + (tenant.espaco_extra_fotos || 0);
}

// Todos os limites que o plano impõe, num lugar só (o servidor confere; as telas só mostram).
const MAX_BANNERS = 5;
function limites(plano, tenant) {
  return { fotosAve: plano.limite_fotos_ave, galeria: limiteGaleria(plano, tenant), banners: MAX_BANNERS, aves: plano.limite_aves };
}

module.exports = { MAX_BANNERS, limites, getPlano, todosPlanos, limparCachePlanos, estadoAcesso, limiteGaleria };
