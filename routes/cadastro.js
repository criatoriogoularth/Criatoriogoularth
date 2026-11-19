// routes/cadastro.js — cadastro de novo criador POR CONVITE.
//   GET  /api/cadastro/convite/:token   confere o convite
//   GET  /api/cadastro/slug/:slug       o endereço está livre?
//   POST /api/cadastro/convite/:token   cria o criatório (banco próprio), a conta e já entra
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');
const master = require('../db/masterPool');
const tenants = require('../db/tenants');
const asyncHandler = require('../middleware/asyncHandler');
const { cifrar, decifrar, hmac, hashToken } = require('../lib/crypto');
const { getPlano } = require('../lib/planos');
const { limparTexto } = require('../lib/sanitizar');
const { criarToken } = require('../lib/tokens');
const { enviarEmail, modelos } = require('../lib/email');
const { slugValido, emailValido, soDigitos, cpfValido } = require('../lib/validacao');

const router = express.Router();
const DIA = 24 * 60 * 60 * 1000;

// limite simples por IP para não virar fábrica de contas
const tent = new Map();
function limite(ip, max = 20) {
  const r = tent.get(ip) || { n: 0, ini: Date.now() };
  if (Date.now() - r.ini > 60 * 60 * 1000) { r.n = 0; r.ini = Date.now(); }
  r.n += 1; tent.set(ip, r);
  return r.n > max;
}

async function conviteValido(token) {
  if (!token || token.length < 20) return null;
  const { rows } = await master.query(
    'SELECT * FROM convites WHERE token_hash = $1 AND usado_em IS NULL AND expira_em > NOW()', [hashToken(token)]);
  return rows[0] || null;
}

router.get('/convite/:token', asyncHandler(async (req, res) => {
  if (limite(req.ip, 60)) return res.status(429).json({ error: 'Muitas tentativas.' });
  const c = await conviteValido(req.params.token);
  if (!c) return res.status(404).json({ error: 'Convite inválido, usado ou vencido.' });
  const plano = await getPlano(c.plano_id);
  res.json({ valido: true, plano: plano && plano.nome, diasTeste: c.dias_teste || (plano && plano.dias_teste) || null, emailDestino: c.email_destino || null, baseDominio: process.env.BASE_DOMAIN || null });
}));

router.get('/slug/:slug', asyncHandler(async (req, res) => {
  if (limite(req.ip, 120)) return res.status(429).json({ error: 'Muitas tentativas.' });
  const s = String(req.params.slug || '').toLowerCase();
  if (!slugValido(s)) return res.json({ disponivel: false, motivo: 'invalido' });
  const { rows } = await master.query('SELECT 1 FROM tenants WHERE slug = $1', [s]);
  res.json({ disponivel: rows.length === 0, motivo: rows.length ? 'em_uso' : null });
}));

// Cria o banco do cliente: usa o do convite (ex.: projeto do Neon) ou cria um novo no servidor.
async function provisionarBanco(slug, convite) {
  if (convite.db_url_enc) return { url: decifrar(convite.db_url_enc), criado: null };
  const admin = process.env.ADMIN_DATABASE_URL;
  if (!admin) { const e = new Error('Sem banco disponível'); e.codigo = 'SEM_BANCO'; throw e; }
  const nome = 'aviari_' + slug.replace(/-/g, '_');
  const c = new Client({ connectionString: admin, ssl: tenants.sslPara(admin) });
  await c.connect();
  try { await c.query(`CREATE DATABASE "${nome}"`); } finally { await c.end(); }
  const u = new URL(admin); u.pathname = '/' + nome;
  return { url: u.toString(), criado: nome };
}
async function apagarBancoCriado(nome) {
  if (!nome || !process.env.ADMIN_DATABASE_URL) return;
  const admin = process.env.ADMIN_DATABASE_URL;
  const c = new Client({ connectionString: admin, ssl: tenants.sslPara(admin) });
  try { await c.connect(); await c.query(`DROP DATABASE IF EXISTS "${nome}"`); } catch (e) { /* melhor esforço */ }
  finally { await c.end().catch(() => {}); }
}

router.post('/convite/:token', asyncHandler(async (req, res) => {
  if (limite(req.ip, 15)) return res.status(429).json({ error: 'Muitas tentativas. Tente mais tarde.' });

  const convite = await conviteValido(req.params.token);
  if (!convite) return res.status(404).json({ error: 'Convite inválido, usado ou vencido.' });

  const b = req.body || {};
  const nome = limparTexto(String(b.nome || '').trim().slice(0, 255));
  const criatorio = limparTexto(String(b.criatorio || '').trim().slice(0, 160));
  const email = String(b.email || '').trim().toLowerCase();
  const slug = String(b.slug || '').trim().toLowerCase();
  const senha = String(b.senha || '');
  const cpfDig = soDigitos(b.cpf);

  if (nome.length < 2) return res.status(400).json({ error: 'Informe seu nome.' });
  if (criatorio.length < 2) return res.status(400).json({ error: 'Informe o nome do criatório.' });
  if (!emailValido(email)) return res.status(400).json({ error: 'E-mail inválido.' });
  if (convite.email_destino && convite.email_destino.toLowerCase() !== email) {
    return res.status(400).json({ error: 'Este convite foi feito para outro e-mail.' });
  }
  if (senha.length < 8) return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
  if (!slugValido(slug)) return res.status(400).json({ error: 'Endereço inválido. Use 3 a 40 letras minúsculas, números ou hífen.' });
  if (cpfDig && !cpfValido(cpfDig)) return res.status(400).json({ error: 'CPF inválido.' });
  if (b.aceite !== true) return res.status(400).json({ error: 'É preciso aceitar os Termos de Uso e a Política de Privacidade.' });

  const plano = await getPlano(convite.plano_id);
  if (!plano) return res.status(500).json({ error: 'Plano do convite não existe.' });

  const dup = await master.query(
    `SELECT (SELECT COUNT(*) FROM tenants WHERE slug = $1)::int AS s,
            (SELECT COUNT(*) FROM contas WHERE LOWER(email) = $2)::int AS e,
            (SELECT COUNT(*) FROM contas WHERE $3::text IS NOT NULL AND cpf_hmac = $3)::int AS c`,
    [slug, email, cpfDig ? hmac(cpfDig) : null]);
  if (dup.rows[0].s) return res.status(409).json({ error: 'Este endereço já está em uso. Escolha outro.' });
  if (dup.rows[0].e) return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
  if (dup.rows[0].c) return res.status(409).json({ error: 'Já existe uma conta com este CPF.' });

  let banco;
  try { banco = await provisionarBanco(slug, convite); }
  catch (e) {
    if (e.codigo === 'SEM_BANCO') return res.status(503).json({ error: 'No momento não há vaga disponível. Avise quem te enviou o convite.' });
    console.error('Erro ao criar banco do cliente:', e.message);
    return res.status(500).json({ error: 'Não foi possível preparar o seu criatório. Tente novamente.' });
  }

  const senhaHash = await bcrypt.hash(senha, 12);
  const cx = await master.connect();
  try {
    await cx.query('BEGIN');
    const emTeste = convite.plano_id === 'teste';
    const dias = convite.dias_teste || plano.dias_teste || 20;
    const { rows: [t] } = await cx.query(
      `INSERT INTO tenants (slug, nome, plano_id, status, trial_fim, plano_fim, db_url_enc)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, slug, nome, plano_id, status, trial_fim, plano_fim, carencia_dias, dominio_proprio, dominio_ativo, espaco_extra_fotos, db_url_enc, criado_em`,
      [slug, criatorio, convite.plano_id, emTeste ? 'teste' : 'ativo',
       emTeste ? new Date(Date.now() + dias * DIA) : null,
       emTeste ? null : new Date(Date.now() + (convite.dias_teste || 365) * DIA),
       cifrar(banco.url)]);
    const { rows: [c] } = await cx.query(
      `INSERT INTO contas (tenant_id, usuario_tenant_id, role, nome, email, senha_hash, cpf_hmac, cpf_enc, aceite_termos_em)
       VALUES ($1, 1, 'cliente', $2, $3, $4, $5, $6, NOW()) RETURNING id`,
      [t.id, nome, email, senhaHash, cpfDig ? hmac(cpfDig) : null, cpfDig ? cifrar(cpfDig) : null]);
    await cx.query('UPDATE convites SET usado_em = NOW(), tenant_id = $1 WHERE id = $2 AND usado_em IS NULL', [t.id, convite.id]);

    await tenants.poolDoTenant(t);            // aplica o esquema no banco novo (falha => desfaz tudo)
    await cx.query('COMMIT');
    tenants.invalidar();

    // e-mail de confirmação (não bloqueia o cadastro se o envio falhar)
    criarToken(c.id, 'confirmar', 60 * 48).then((tk) => enviarEmail({ para: email, ...modelos.confirmar(nome, tk) })).catch(() => {});

    const token = jwt.sign({ id: 1, conta: c.id, tenant: t.id, role: 'admin', email, criatorio: t.nome },
      process.env.JWT_SECRET, { expiresIn: '8h' });
    res.status(201).json({ token, redirect: 'dashboard.html', slug: t.slug,
      usuario: { id: 1, nome, email, role: 'admin', criatorio: t.nome, slug: t.slug } });
  } catch (e) {
    await cx.query('ROLLBACK').catch(() => {});
    await apagarBancoCriado(banco.criado);
    if (e.code === '23505') return res.status(409).json({ error: 'Endereço ou e-mail já em uso.' });
    console.error('Erro no cadastro:', e);
    res.status(500).json({ error: 'Não foi possível concluir o cadastro. Tente novamente.' });
  } finally { cx.release(); }
}));

module.exports = router;
