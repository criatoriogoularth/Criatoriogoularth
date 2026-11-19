// routes/dono.js — painel do DONO da plataforma.
//
// Regra de privacidade: o dono vê números e situação das contas (nome do
// criatório, e-mail da conta, plano, vencimento, tamanho). NÃO existe rota
// que leia aves, fotos, mensagens ou qualquer conteúdo de um criatório.
// Toda ação sobre um cliente fica registrada na tabela "auditoria".
const express = require('express');
const master = require('../db/masterPool');
const tenants = require('../db/tenants');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { cifrar, hashToken, novoToken } = require('../lib/crypto');
const { getPlano, limparCachePlanos, estadoAcesso } = require('../lib/planos');
const { dominioValido, emailValido } = require('../lib/validacao');
const { registrarPagamento } = require('../lib/pagamentos');
const { criarToken } = require('../lib/tokens');
const { rodarAvisos } = require('../lib/avisos');

const router = express.Router();
router.use(authMiddleware.dono);

const DIA = 24 * 60 * 60 * 1000;
const audit = (req, tenantId, acao, detalhe = {}) =>
  master.query('INSERT INTO auditoria (conta_id, tenant_id, acao, detalhe) VALUES ($1,$2,$3,$4)',
    [req.user.conta, tenantId || null, acao, JSON.stringify(detalhe)]).catch(() => {});

router.get('/resumo', asyncHandler(async (req, res) => {
  const { rows } = await master.query(`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'teste' AND trial_fim > NOW())::int AS em_teste,
      COUNT(*) FILTER (WHERE status = 'teste' AND trial_fim <= NOW())::int AS teste_acabou,
      COUNT(*) FILTER (WHERE status = 'ativo')::int AS ativos,
      COUNT(*) FILTER (WHERE status IN ('vencido'))::int AS vencidos,
      COUNT(*) FILTER (WHERE status = 'suspenso')::int AS suspensos,
      COUNT(*) FILTER (WHERE (status = 'teste' AND trial_fim BETWEEN NOW() AND NOW() + INTERVAL '3 days')
                          OR (status = 'ativo' AND plano_fim BETWEEN NOW() AND NOW() + INTERVAL '7 days'))::int AS vencendo
    FROM tenants`);
  const s = await master.query('SELECT COUNT(*)::int AS n FROM sugestoes WHERE NOT resolvida');
  res.json({ ...rows[0], sugestoesAbertas: s.rows[0].n });
}));

router.get('/planos', asyncHandler(async (req, res) => {
  const { rows } = await master.query('SELECT * FROM planos ORDER BY ordem, id');
  res.json(rows);
}));

router.put('/planos/:id', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const num = (v) => (v === null || v === '' || v === undefined ? null : Number(v));
  const campos = {
    nome: b.nome, descricao: b.descricao,
    preco_anual_centavos: b.preco_anual_centavos === undefined ? undefined : num(b.preco_anual_centavos),
    limite_galeria_subdominio: b.limite_galeria_subdominio, limite_galeria_dominio: b.limite_galeria_dominio,
    limite_fotos_ave: b.limite_fotos_ave,
    limite_aves: b.limite_aves === undefined ? undefined : num(b.limite_aves),
    dias_teste: b.dias_teste === undefined ? undefined : num(b.dias_teste),
    ativo: b.ativo
  };
  const sets = [], vals = [];
  for (const [k, v] of Object.entries(campos)) if (v !== undefined) { vals.push(v); sets.push(`${k} = $${vals.length}`); }
  if (!sets.length) return res.status(400).json({ error: 'Nada para alterar.' });
  vals.push(req.params.id);
  const { rows } = await master.query(`UPDATE planos SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, vals);
  if (!rows[0]) return res.status(404).json({ error: 'Plano não encontrado.' });
  limparCachePlanos();
  await audit(req, null, 'plano_editado', { plano: req.params.id, campos: Object.keys(campos).filter((k) => campos[k] !== undefined) });
  res.json(rows[0]);
}));

router.get('/clientes', asyncHandler(async (req, res) => {
  const { rows } = await master.query(`
    SELECT t.id, t.slug, t.nome, t.plano_id, t.status, t.trial_fim, t.plano_fim, t.dominio_proprio, t.dominio_ativo,
           t.espaco_extra_fotos, t.criado_em, c.email AS email_conta, c.nome AS nome_conta
    FROM tenants t LEFT JOIN contas c ON c.tenant_id = t.id
    ORDER BY t.criado_em DESC`);
  res.json(rows.map((t) => ({ ...t, acesso: (({ ativo, motivo, diasRestantes, somenteLeitura }) => ({ ativo, motivo, diasRestantes, somenteLeitura }))(estadoAcesso(t)) })));
}));

// Tamanho e contagens — só números, nada de conteúdo.
router.get('/clientes/:id/uso', asyncHandler(async (req, res) => {
  const t = await tenants.porId(Number(req.params.id));
  if (!t) return res.status(404).json({ error: 'Cliente não encontrado.' });
  const db = await tenants.poolDoTenant(t);
  const { rows } = await db.query(`SELECT pg_database_size(current_database())::bigint AS bytes,
      (SELECT COUNT(*) FROM aves)::int AS aves, (SELECT COUNT(*) FROM aves WHERE no_site)::int AS aves_no_site`);
  await audit(req, t.id, 'ver_uso');
  res.json({ bytes: Number(rows[0].bytes), aves: rows[0].aves, avesNoSite: rows[0].aves_no_site });
}));

router.put('/clientes/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body || {};
  const sets = [], vals = [], det = {};
  const add = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); det[col] = v; };

  if (b.status !== undefined) {
    if (!['teste', 'ativo', 'vencido', 'suspenso'].includes(b.status)) return res.status(400).json({ error: 'Status inválido.' });
    add('status', b.status);
  }
  if (b.plano_id !== undefined) {
    if (!(await getPlano(b.plano_id))) return res.status(400).json({ error: 'Plano inexistente.' });
    add('plano_id', b.plano_id);
  }
  for (const col of ['trial_fim', 'plano_fim']) {
    if (b[col] !== undefined) {
      const d = b[col] === null ? null : new Date(b[col]);
      if (d && isNaN(d)) return res.status(400).json({ error: `Data inválida em ${col}.` });
      add(col, d);
    }
  }
  if (b.carencia_dias !== undefined) add('carencia_dias', Math.max(0, Math.min(30, Number(b.carencia_dias) || 0)));
  if (b.espaco_extra_fotos !== undefined) add('espaco_extra_fotos', Math.max(0, Number(b.espaco_extra_fotos) || 0));
  if (b.dominio_proprio !== undefined) {
    const d = b.dominio_proprio ? String(b.dominio_proprio).toLowerCase().trim() : null;
    if (d && !dominioValido(d)) return res.status(400).json({ error: 'Domínio inválido.' });
    add('dominio_proprio', d);
    if (!d) add('dominio_ativo', false);
  }
  if (b.dominio_ativo !== undefined) add('dominio_ativo', !!b.dominio_ativo);
  if (!sets.length) return res.status(400).json({ error: 'Nada para alterar.' });

  vals.push(id);
  try {
    const { rows } = await master.query(`UPDATE tenants SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id, slug, status, plano_id`, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado.' });
    tenants.invalidar();
    await audit(req, id, 'cliente_alterado', det);
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Este domínio já está em uso por outro cliente.' });
    throw e;
  }
}));

// Dá mais dias (teste ou anuidade) — atalho para o dia a dia
router.post('/clientes/:id/prorrogar', asyncHandler(async (req, res) => {
  const dias = Math.max(1, Math.min(730, Number(req.body && req.body.dias) || 0));
  if (!dias) return res.status(400).json({ error: 'Informe os dias.' });
  const t = await tenants.porId(Number(req.params.id));
  if (!t) return res.status(404).json({ error: 'Cliente não encontrado.' });
  const base = (d) => { const x = d ? new Date(d) : new Date(); return x > new Date() ? x : new Date(); };
  if (t.status === 'ativo') {
    await master.query('UPDATE tenants SET plano_fim = $1 WHERE id = $2', [new Date(base(t.plano_fim).getTime() + dias * DIA), t.id]);
  } else {
    await master.query(`UPDATE tenants SET status = 'teste', trial_fim = $1 WHERE id = $2`, [new Date(base(t.trial_fim).getTime() + dias * DIA), t.id]);
  }
  tenants.invalidar();
  await audit(req, t.id, 'prorrogado', { dias });
  res.json({ ok: true });
}));

// Pagamento recebido (Pix/boleto fora do sistema): renova o plano a partir do vencimento atual.
router.post('/clientes/:id/pagamento', asyncHandler(async (req, res) => {
  const b = req.body || {};
  try {
    const r = await registrarPagamento({
      tenantId: Number(req.params.id), planoId: b.plano_id || 'completo', meses: b.meses || 12,
      valorCentavos: b.valor_centavos == null || b.valor_centavos === '' ? null : Math.round(Number(b.valor_centavos)),
      origem: 'manual', obs: b.observacao ? String(b.observacao).slice(0, 255) : null, por: req.user.conta });
    await audit(req, Number(req.params.id), 'pagamento_registrado', { plano: b.plano_id || 'completo', meses: b.meses || 12 });
    res.status(201).json(r);
  } catch (e) { if (e.status) return res.status(e.status).json({ error: e.message }); throw e; }
}));

router.get('/pagamentos', asyncHandler(async (req, res) => {
  const { rows } = await master.query(
    `SELECT p.id, p.plano_id, p.valor_centavos, p.meses, p.origem, p.observacao, p.criado_em, t.slug, t.nome
       FROM pagamentos p JOIN tenants t ON t.id = p.tenant_id ORDER BY p.id DESC LIMIT 100`);
  res.json(rows);
}));

// Para quem esqueceu a senha e o e-mail ainda não está configurado: o dono gera o link e manda por WhatsApp.
router.post('/clientes/:id/link-redefinicao', asyncHandler(async (req, res) => {
  const { rows } = await master.query(`SELECT id FROM contas WHERE tenant_id = $1 AND role = 'cliente' ORDER BY id LIMIT 1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado.' });
  const token = await criarToken(rows[0].id, 'reset', 60);
  await audit(req, Number(req.params.id), 'link_redefinicao_gerado');
  res.status(201).json({ link: `${(process.env.APP_URL || '').replace(/\/$/, '')}/redefinir.html?token=${token}`, validoPorMinutos: 60 });
}));

// E-mails enviados. No "modo de teste" (sem provedor de e-mail) o texto aparece aqui.
router.get('/emails', asyncHandler(async (req, res) => {
  const { rows } = await master.query('SELECT id, para, assunto, corpo, enviado, erro, criado_em FROM emails_log ORDER BY id DESC LIMIT 50');
  res.json(rows);
}));

router.post('/avisos/executar', asyncHandler(async (req, res) => {
  res.json({ enviados: await rodarAvisos() });
}));

// ---------- convites ----------
router.post('/convites', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const plano = await getPlano(b.plano_id || 'teste');
  if (!plano) return res.status(400).json({ error: 'Plano inexistente.' });
  if (b.email_destino && !emailValido(b.email_destino)) return res.status(400).json({ error: 'E-mail do convite inválido.' });
  const validade = Math.max(1, Math.min(60, Number(b.validade_dias) || 7));
  const token = novoToken(24);
  const { rows } = await master.query(
    `INSERT INTO convites (token_hash, plano_id, dias_teste, email_destino, db_url_enc, observacao, expira_em, criado_por)
     VALUES ($1,$2,$3,$4,$5,$6, NOW() + ($7 || ' days')::interval, $8) RETURNING id, expira_em`,
    [hashToken(token), plano.id, b.dias_teste ? Number(b.dias_teste) : null, b.email_destino || null,
     b.db_url ? cifrar(String(b.db_url).trim()) : null, b.observacao ? String(b.observacao).slice(0, 255) : null, String(validade), req.user.conta]);
  await audit(req, null, 'convite_criado', { convite: rows[0].id, plano: plano.id });
  const base = (process.env.APP_URL || '').replace(/\/$/, '');
  // O link só aparece AGORA — no banco fica apenas o hash.
  res.status(201).json({ id: rows[0].id, expira_em: rows[0].expira_em, link: `${base}/cadastro.html?convite=${token}` });
}));

router.get('/convites', asyncHandler(async (req, res) => {
  const { rows } = await master.query(
    `SELECT v.id, v.plano_id, v.dias_teste, v.email_destino, v.observacao, v.expira_em, v.usado_em, v.criado_em, t.slug AS usado_por
     FROM convites v LEFT JOIN tenants t ON t.id = v.tenant_id ORDER BY v.criado_em DESC LIMIT 100`);
  res.json(rows);
}));

router.delete('/convites/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await master.query('DELETE FROM convites WHERE id = $1 AND usado_em IS NULL', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Convite não encontrado ou já usado.' });
  await audit(req, null, 'convite_apagado', { convite: Number(req.params.id) });
  res.json({ ok: true });
}));

// ---------- sugestões dos testadores ----------
router.get('/sugestoes', asyncHandler(async (req, res) => {
  const { rows } = await master.query(
    `SELECT s.id, s.tipo, s.pagina, s.texto, s.resolvida, s.criado_em, t.nome AS criatorio, t.slug
     FROM sugestoes s LEFT JOIN tenants t ON t.id = s.tenant_id ORDER BY s.resolvida, s.criado_em DESC LIMIT 200`);
  res.json(rows);
}));
router.put('/sugestoes/:id/resolver', asyncHandler(async (req, res) => {
  await master.query('UPDATE sugestoes SET resolvida = $1 WHERE id = $2', [req.body && req.body.resolvida === false ? false : true, req.params.id]);
  res.json({ ok: true });
}));

router.get('/auditoria', asyncHandler(async (req, res) => {
  const { rows } = await master.query(
    `SELECT a.id, a.acao, a.detalhe, a.criado_em, t.slug FROM auditoria a LEFT JOIN tenants t ON t.id = a.tenant_id ORDER BY a.id DESC LIMIT 200`);
  res.json(rows);
}));

module.exports = router;
