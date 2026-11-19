// middleware/tenant.js — descobre de qual criatório é um SITE PÚBLICO.
//
// Ordem: (1) domínio próprio ativo  (2) subdomínio  (3) cabeçalho X-Tenant  (4) ?t=slug
//        (5) Referer /c/slug/...  (6) token do dono (pré-visualização)  (7) DEFAULT_TENANT_SLUG
//
// Atenção: isto só vale para rotas PÚBLICAS (o que o visitante vê). As rotas
// privadas usam o banco do token (middleware/auth.js) e ignoram tudo isso.
const jwt = require('jsonwebtoken');
const tenants = require('../db/tenants');
const { getPlano, estadoAcesso } = require('../lib/planos');
const { slugValido } = require('../lib/validacao');

const BASE = (process.env.BASE_DOMAIN || '').toLowerCase().replace(/^\./, '');
const SLUG_RE = /^[a-z0-9-]{3,40}$/;

function hostDe(req) {
  return String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].split(':')[0].trim().toLowerCase();
}

function slugDoHost(host) {
  if (!BASE || !host.endsWith('.' + BASE)) return null;
  const sub = host.slice(0, -(BASE.length + 1));
  return sub && !sub.includes('.') && slugValido(sub) ? sub : null;
}

function slugDoReferer(req) {
  const ref = req.headers.referer || '';
  const m = /\/c\/([a-z0-9-]{3,40})(?:\/|\?|#|$)/.exec(ref);
  if (m) return m[1];
  try {
    const u = new URL(ref);
    return slugDoHost(u.hostname.toLowerCase());
  } catch (e) { return null; }
}

// Devolve o tenant do site (sem checar plano) ou null.
async function acharTenantDoSite(req) {
  const host = hostDe(req);
  let t = host ? await tenants.porDominio(host) : null;
  if (t) return t;

  const candidatos = [
    slugDoHost(host),
    SLUG_RE.test(String(req.headers['x-tenant'] || '')) ? String(req.headers['x-tenant']) : null,
    SLUG_RE.test(String(req.query.t || '')) ? String(req.query.t) : null,
    slugDoReferer(req)
  ].filter(Boolean);

  for (const s of candidatos) {
    t = await tenants.porSlug(s);
    if (t) return t;
  }

  // dono do criatório visitando o próprio site sem endereço próprio (pré-visualização)
  const [esquema, token] = String(req.headers.authorization || '').split(' ');
  if (esquema === 'Bearer' && token) {
    try {
      const p = jwt.verify(token, process.env.JWT_SECRET);
      if (p.tenant) { t = await tenants.porId(p.tenant); if (t) return t; }
    } catch (e) { /* token inválido: segue */ }
  }

  if (process.env.DEFAULT_TENANT_SLUG) return tenants.porSlug(process.env.DEFAULT_TENANT_SLUG);
  return null;
}

// Só pelo ENDEREÇO (domínio próprio ou subdomínio) — usado para decidir o que a página inicial mostra.
async function acharTenantPorHost(req) {
  const host = hostDe(req);
  if (!host) return null;
  const t = await tenants.porDominio(host);
  if (t) return t;
  const s = slugDoHost(host);
  return s ? tenants.porSlug(s) : null;
}

// Preenche req.db com o banco do site (não bloqueia; quem exige é exigirSite).
async function resolverSite(req, res, next) {
  try {
    const t = await acharTenantDoSite(req);
    if (t) {
      req.siteTenant = t;
      req.sitePlano = await getPlano(t.plano_id);
      req.siteAcesso = estadoAcesso(t);
      if (req.siteAcesso.ativo && req.sitePlano && req.sitePlano.site) {
        req.db = await tenants.poolDoTenant(t);
      }
    }
    next();
  } catch (e) { next(e); }
}

// Rotas públicas: precisam de um site ativo e que o plano inclua site.
function exigirSite(req, res, next) {
  if (!req.siteTenant) return res.status(404).json({ error: 'Site não encontrado.', codigo: 'SITE_NAO_ENCONTRADO' });
  if (!req.siteAcesso.ativo) return res.status(503).json({ error: 'Este site está temporariamente indisponível.', codigo: 'SITE_INDISPONIVEL' });
  if (!req.sitePlano || !req.sitePlano.site) return res.status(404).json({ error: 'Site não encontrado.', codigo: 'SITE_NAO_ENCONTRADO' });
  if (!req.db) return res.status(503).json({ error: 'Site indisponível.', codigo: 'SITE_INDISPONIVEL' });
  next();
}

// É uma rota que o visitante (sem login) pode chamar?
function ehRotaPublica(req) {
  const u = req.originalUrl.split('?')[0];
  if (req.method === 'GET' && /^\/api\/(aves\/publico|config\/publico)(\/|$)/.test(u)) return true;
  if (req.method === 'POST' && /^\/api\/(visitas|mensagens)\/?$/.test(u)) return true;
  return false;
}

module.exports = { resolverSite, exigirSite, ehRotaPublica, acharTenantDoSite, acharTenantPorHost, hostDe, slugDoHost };
