// db/tenants.js — descobre o cliente (tenant) e entrega a conexão do BANCO DELE.
//
// Cada criatório tem um banco próprio. Aqui ficam:
//  - o cache de clientes (60 s) para não consultar o mestre a cada clique;
//  - um "pool" de conexões por cliente, limitado (MAX_TENANT_POOLS) — o que
//    está parado há mais tempo é fechado, para o servidor não estourar a
//    memória nem o limite de conexões do banco quando há muitos clientes.
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const master = require('./masterPool');
const { decifrar } = require('../lib/crypto');

const SCHEMA = fs.readFileSync(path.join(__dirname, 'tenant-schema.sql'), 'utf8');
const MAX_POOLS = Number(process.env.MAX_TENANT_POOLS || 25);
const CONN_POR_POOL = Number(process.env.TENANT_POOL_MAX || 3);
const CACHE_MS = 60 * 1000;

const COLS = `id, slug, nome, plano_id, status, trial_fim, plano_fim, carencia_dias,
              dominio_proprio, dominio_ativo, espaco_extra_fotos, db_url_enc, criado_em`;

const cache = new Map();           // chave -> { t, exp }
const pools = new Map();           // tenantId -> { pool, pronto, ultimoUso, url }

function guardar(chave, t) { cache.set(chave, { t, exp: Date.now() + CACHE_MS }); return t; }
function lerCache(chave) {
  const c = cache.get(chave);
  if (c && c.exp > Date.now()) return c;
  cache.delete(chave);
  return null;
}

async function buscar(where, valor) {
  const { rows } = await master.query(`SELECT ${COLS} FROM tenants WHERE ${where} LIMIT 1`, [valor]);
  return rows[0] || null;
}

async function porId(id) {
  const k = 'id:' + id; const c = lerCache(k); if (c) return c.t;
  return guardar(k, await buscar('id = $1', id));
}
async function porSlug(slug) {
  const k = 'slug:' + slug; const c = lerCache(k); if (c) return c.t;
  return guardar(k, await buscar('slug = $1', slug));
}
async function porDominio(host) {
  const k = 'dom:' + host; const c = lerCache(k); if (c) return c.t;
  return guardar(k, await buscar('dominio_ativo = true AND dominio_proprio = $1', host));
}
function invalidar() { cache.clear(); }

function sslPara(url) {
  if (process.env.PGSSL === 'false' || /sslmode=disable/.test(url)) return false;
  return { rejectUnauthorized: false };
}

function fecharMaisAntigo() {
  let alvo = null;
  for (const [id, p] of pools) if (!alvo || p.ultimoUso < alvo.p.ultimoUso) alvo = { id, p };
  if (alvo) { pools.delete(alvo.id); alvo.p.pool.end().catch(() => {}); }
}

// Entrega o pool do banco do cliente (aplicando o schema na 1ª vez no processo).
async function poolDoTenant(tenant) {
  let p = pools.get(tenant.id);
  if (!p) {
    while (pools.size >= MAX_POOLS) fecharMaisAntigo();
    const url = decifrar(tenant.db_url_enc);
    const pool = new Pool({
      connectionString: url,
      ssl: sslPara(url),
      max: CONN_POR_POOL,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 20000
    });
    pool.on('error', (e) => console.error(`Erro no banco do cliente ${tenant.slug}:`, e.message));
    p = { pool, url, ultimoUso: Date.now(), pronto: null };
    p.pronto = prepararBanco(pool, tenant).catch((e) => {
      pools.delete(tenant.id);
      pool.end().catch(() => {});
      throw e;
    });
    pools.set(tenant.id, p);
  }
  p.ultimoUso = Date.now();
  await p.pronto;
  return p.pool;
}

// Aplica o schema e garante o usuário dono (id = 1) dentro do banco do cliente.
async function prepararBanco(pool, tenant) {
  await pool.query(SCHEMA);
  await pool.query(
    `INSERT INTO usuarios (id, nome, email, senha_hash, role, status, criatorio)
     VALUES (1, $1, $2, '!sem-login-aqui', 'admin', 'aprovado', $3)
     ON CONFLICT DO NOTHING`,
    [tenant.nome, `dono@${tenant.slug}.local`, tenant.nome]
  ).catch(() => {});   // bancos antigos podem já ter o usuário com outro e-mail
  await pool.query(
    `SELECT setval(pg_get_serial_sequence('usuarios','id'), GREATEST(1, (SELECT COALESCE(MAX(id),1) FROM usuarios)))`
  );
}

async function fecharTudo() {
  for (const [, p] of pools) await p.pool.end().catch(() => {});
  pools.clear();
}

module.exports = { porId, porSlug, porDominio, invalidar, poolDoTenant, prepararBanco, fecharTudo, sslPara };
