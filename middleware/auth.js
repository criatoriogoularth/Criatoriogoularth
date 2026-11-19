// middleware/auth.js
//
// 1) Confere o token (JWT).
// 2) Descobre de qual criatório é a pessoa (token -> tenant) e entrega o
//    BANCO DELE em req.db. Rotas privadas só enxergam o banco do token —
//    nunca o que vem de endereço, cabeçalho ou parâmetro.
// 3) Aplica o plano: teste acabado/plano vencido bloqueia (402); a carência
//    deixa só ler.
const jwt = require('jsonwebtoken');
const tenants = require('../db/tenants');
const { getPlano, estadoAcesso } = require('../lib/planos');

// Rotas que continuam abertas mesmo com o acesso bloqueado (tela de planos, senha, sair).
const LIVRES_BLOQUEADO = [/^\/api\/auth\//, /^\/api\/conta(\/|$)/, /^\/api\/sugestoes(\/|$)/, /^\/api\/backup\/exportar$/];

async function carregar(req, res, { permitirBloqueado, aceitaDono = false, somenteDono = false }) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Não autenticado. Faça login novamente.' });
    return false;
  }

  let p;
  try { p = jwt.verify(token, process.env.JWT_SECRET); }
  catch (e) {
    res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
    return false;
  }

  req.user = { id: p.id, email: p.email, role: p.role, criatorio: p.criatorio, conta: p.conta, tenant: p.tenant };

  if (p.role === 'dono') {
    // O dono da plataforma NÃO tem banco de criatório: só entra onde for permitido (painel do dono, /me, senha).
    if (!aceitaDono) { res.status(403).json({ error: 'Acesso restrito a criadores.' }); return false; }
    req.db = undefined; req.authFeito = true; return true;
  }
  if (somenteDono) { res.status(403).json({ error: 'Acesso restrito.' }); return false; }

  const tenant = p.tenant ? await tenants.porId(p.tenant) : null;
  if (!tenant) {
    res.status(401).json({ error: 'Sessão inválida. Faça login novamente.' });
    return false;
  }
  const plano = await getPlano(tenant.plano_id);
  const acesso = estadoAcesso(tenant);

  req.tenant = tenant;
  req.plano = plano;
  req.acesso = acesso;

  const url = req.originalUrl.split('?')[0];
  const liberado = permitirBloqueado || LIVRES_BLOQUEADO.some((r) => r.test(url));

  if (!acesso.ativo && !liberado) {
    res.status(402).json({
      error: 'Seu acesso está bloqueado. Escolha um plano para continuar.',
      codigo: 'ACESSO_BLOQUEADO', motivo: acesso.motivo
    });
    return false;
  }
  if (acesso.somenteLeitura && req.method !== 'GET' && !liberado) {
    res.status(402).json({
      error: 'Seu plano venceu. Você pode consultar seus dados, mas não alterar, até renovar.',
      codigo: 'SOMENTE_LEITURA'
    });
    return false;
  }

  req.db = await tenants.poolDoTenant(tenant);   // SEMPRE o banco do token
  req.authFeito = true;
  return true;
}

function fabrica(opcoes) {
  return async function authMiddleware(req, res, next) {
    if (req.authFeito) return next();                    // já validado no filtro geral
    try {
      if (await carregar(req, res, opcoes)) next();
    } catch (e) { next(e); }
  };
}

const authMiddleware = fabrica({ permitirBloqueado: false });
authMiddleware.livre = fabrica({ permitirBloqueado: true, aceitaDono: true });   // tela de planos, senha, /me...

// Só o dono da plataforma
authMiddleware.dono = fabrica({ permitirBloqueado: true, aceitaDono: true, somenteDono: true });

module.exports = authMiddleware;
