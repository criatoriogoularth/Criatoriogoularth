// routes/auth.js — login pelo banco MESTRE (e-mail ou CPF + senha).
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const master = require('../db/masterPool');
const tenants = require('../db/tenants');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { hmac } = require('../lib/crypto');
const { getPlano, estadoAcesso, limites } = require('../lib/planos');
const { soDigitos, cpfValido } = require('../lib/validacao');
const { criarToken, consumirToken } = require('../lib/tokens');
const { enviarEmail, modelos } = require('../lib/email');

const router = express.Router();

// Limite de tentativas em memória (por IP e por login informado).
const tentativas = new Map();
const MAX_TENTATIVAS = 5;
const JANELA_MS = 15 * 60 * 1000;
function bloqueado(chave) {
  const r = tentativas.get(chave);
  if (!r) return false;
  if (Date.now() - r.inicio > JANELA_MS) { tentativas.delete(chave); return false; }
  return r.count >= MAX_TENTATIVAS;
}
function falha(...chaves) {
  for (const c of chaves) {
    const r = tentativas.get(c) || { count: 0, inicio: Date.now() };
    r.count += 1; tentativas.set(c, r);
  }
}
const limpar = (...chaves) => chaves.forEach((c) => tentativas.delete(c));

// hash "de mentira" para gastar o mesmo tempo quando o e-mail não existe
const HASH_FALSO = bcrypt.hashSync('nao-existe-essa-conta', 10);

function resumoAcesso(a) {
  return { ativo: a.ativo, motivo: a.motivo || null, tipo: a.tipo || null,
           diasRestantes: a.diasRestantes == null ? null : a.diasRestantes, somenteLeitura: !!a.somenteLeitura };
}

router.post('/login', asyncHandler(async (req, res) => {
  const { identificador, senha } = req.body || {};
  if (!identificador || !senha) return res.status(400).json({ error: 'Informe e-mail/CPF e senha.' });

  const ident = String(identificador).trim().toLowerCase();
  const chaveIp = 'ip:' + req.ip, chaveId = 'id:' + ident;
  if (bloqueado(chaveIp) || bloqueado(chaveId)) {
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
  }

  const digitos = soDigitos(ident);
  const comoCpf = !ident.includes('@') && digitos.length === 11 && cpfValido(digitos) ? hmac(digitos) : null;
  const { rows } = await master.query(
    'SELECT * FROM contas WHERE LOWER(email) = $1 OR ($2::text IS NOT NULL AND cpf_hmac = $2) LIMIT 1',
    [ident, comoCpf]
  );
  const conta = rows[0];
  const ok = await bcrypt.compare(String(senha), conta ? conta.senha_hash : HASH_FALSO);
  if (!conta || !ok) {
    falha(chaveIp, chaveId);
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }
  limpar(chaveIp, chaveId);

  if (conta.role === 'dono') {
    const token = jwt.sign({ id: 0, conta: conta.id, role: 'dono', email: conta.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, redirect: 'dono.html',
      usuario: { id: 0, nome: conta.nome, email: conta.email, role: 'dono', criatorio: 'Aviari' } });
  }

  const tenant = await tenants.porId(conta.tenant_id);
  if (!tenant) return res.status(403).json({ error: 'Conta sem criatório vinculado.' });
  const acesso = estadoAcesso(tenant);

  const token = jwt.sign(
    { id: conta.usuario_tenant_id, conta: conta.id, tenant: tenant.id, role: 'admin', email: conta.email, criatorio: tenant.nome },
    process.env.JWT_SECRET, { expiresIn: '8h' }
  );
  res.json({
    token,
    redirect: acesso.ativo ? 'dashboard.html' : 'plano.html',
    acesso: resumoAcesso(acesso),
    usuario: { id: conta.usuario_tenant_id, nome: conta.nome, email: conta.email, role: 'admin', criatorio: tenant.nome, slug: tenant.slug }
  });
}));

// ---------- esqueci a senha / confirmar e-mail ----------
const pedidos = new Map();                       // limite por IP e por login: 5 pedidos por hora
function pedidoDemais(chave) {
  const r = pedidos.get(chave) || { n: 0, ini: Date.now() };
  if (Date.now() - r.ini > 60 * 60 * 1000) { r.n = 0; r.ini = Date.now(); }
  r.n += 1; pedidos.set(chave, r);
  return r.n > 5;
}

router.post('/esqueci', asyncHandler(async (req, res) => {
  const ident = String((req.body && req.body.identificador) || '').trim().toLowerCase();
  const resposta = { ok: true, mensagem: 'Se existir uma conta com esses dados, enviamos um link para criar uma nova senha. Confira também o spam.' };
  if (!ident) return res.status(400).json({ error: 'Informe o e-mail ou CPF.' });
  if (pedidoDemais('ip:' + req.ip) || pedidoDemais('id:' + ident)) return res.json(resposta);   // não revela nada

  const digitos = soDigitos(ident);
  const comoCpf = !ident.includes('@') && digitos.length === 11 && cpfValido(digitos) ? hmac(digitos) : null;
  const { rows } = await master.query(
    'SELECT id, nome, email FROM contas WHERE LOWER(email) = $1 OR ($2::text IS NOT NULL AND cpf_hmac = $2) LIMIT 1', [ident, comoCpf]);
  if (rows[0]) {
    const token = await criarToken(rows[0].id, 'reset', 60);
    const m = modelos.redefinir(rows[0].nome, token);
    await enviarEmail({ para: rows[0].email, ...m });
  }
  res.json(resposta);                             // mesma resposta exista ou não (não revela quem tem conta)
}));

router.post('/redefinir', asyncHandler(async (req, res) => {
  const { token, senha } = req.body || {};
  if (!senha || String(senha).length < 8) return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
  const contaId = await consumirToken(token, 'reset');
  if (!contaId) return res.status(400).json({ error: 'Link inválido, já usado ou vencido. Peça um novo.' });
  await master.query(
    'UPDATE contas SET senha_hash = $1, email_confirmado_em = COALESCE(email_confirmado_em, NOW()) WHERE id = $2',
    [await bcrypt.hash(String(senha), 12), contaId]);
  await master.query(`UPDATE tokens_conta SET usado_em = NOW() WHERE conta_id = $1 AND tipo = 'reset' AND usado_em IS NULL`, [contaId]);
  tentativas.clear();                              // quem acabou de redefinir não fica preso no limite de tentativas
  res.json({ ok: true });
}));

router.post('/confirmar-email', asyncHandler(async (req, res) => {
  const contaId = await consumirToken(req.body && req.body.token, 'confirmar');
  if (!contaId) return res.status(400).json({ error: 'Link inválido, já usado ou vencido.' });
  await master.query('UPDATE contas SET email_confirmado_em = COALESCE(email_confirmado_em, NOW()) WHERE id = $1', [contaId]);
  res.json({ ok: true });
}));

router.post('/reenviar-confirmacao', authMiddleware.livre, asyncHandler(async (req, res) => {
  const { rows } = await master.query('SELECT id, nome, email, email_confirmado_em FROM contas WHERE id = $1', [req.user.conta]);
  const c = rows[0];
  if (!c) return res.status(404).json({ error: 'Conta não encontrada.' });
  if (c.email_confirmado_em) return res.json({ ok: true, jaConfirmado: true });
  if (pedidoDemais('conf:' + c.id)) return res.status(429).json({ error: 'Aguarde um pouco antes de pedir de novo.' });
  const token = await criarToken(c.id, 'confirmar', 60 * 48);
  const r = await enviarEmail({ para: c.email, ...modelos.confirmar(c.nome, token) });
  res.json({ ok: true, modoTeste: r.modoTeste });
}));

router.get('/me', authMiddleware.livre, asyncHandler(async (req, res) => {
  const { rows } = await master.query('SELECT id, nome, email, role, email_confirmado_em FROM contas WHERE id = $1', [req.user.conta]);
  const c = rows[0];
  if (!c) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (c.role === 'dono') return res.json({ id: 0, nome: c.nome, email: c.email, role: 'dono', criatorio: 'Aviari', status: 'aprovado' });

  const plano = await getPlano(req.tenant.plano_id);
  res.json({
    id: req.user.id, nome: c.nome, email: c.email, role: 'admin', status: 'aprovado', emailConfirmado: !!c.email_confirmado_em,
    criatorio: req.tenant.nome, slug: req.tenant.slug,
    plano: plano && { id: plano.id, nome: plano.nome, gerenciador: plano.gerenciador, site: plano.site, imprimir: plano.imprimir, dominio_proprio: plano.dominio_proprio },
    limites: plano && limites(plano, req.tenant),
    acesso: resumoAcesso(req.acesso)
  });
}));

router.put('/senha', authMiddleware.livre, asyncHandler(async (req, res) => {
  const { senhaAtual, novaSenha } = req.body || {};
  if (!senhaAtual || !novaSenha) return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' });
  if (String(novaSenha).length < 8) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });

  const { rows } = await master.query('SELECT senha_hash FROM contas WHERE id = $1', [req.user.conta]);
  if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (!(await bcrypt.compare(String(senhaAtual), rows[0].senha_hash))) {
    return res.status(401).json({ error: 'Senha atual incorreta.' });
  }
  await master.query('UPDATE contas SET senha_hash = $1 WHERE id = $2', [await bcrypt.hash(String(novaSenha), 12), req.user.conta]);
  res.json({ ok: true });
}));

module.exports = router;
