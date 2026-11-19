// scripts/registrar-legado.js — traz um criatório que JÁ existe (banco antigo) para a plataforma,
// mantendo os dados e o login atuais.
//   node scripts/registrar-legado.js <slug> "<nome do criatório>" <url-do-banco> [plano]
// Ex.: node scripts/registrar-legado.js goularth "Criatório Goularth" "$DATABASE_URL" completo
require('dotenv').config();
const master = require('../db/masterPool');
const tenants = require('../db/tenants');
const { cifrar } = require('../lib/crypto');
const { slugValido } = require('../lib/validacao');
const { Pool } = require('pg');

(async () => {
  const [slug, nome, url, plano = 'completo'] = process.argv.slice(2);
  if (!slug || !nome || !url) { console.error('Uso: node scripts/registrar-legado.js <slug> "<nome>" <url-do-banco> [plano]'); process.exit(1); }
  if (!slugValido(slug)) { console.error('❌ Slug inválido ou reservado.'); process.exit(1); }

  const antigo = new Pool({ connectionString: url, ssl: tenants.sslPara(url), max: 1 });
  const { rows: us } = await antigo.query(`SELECT id, nome, email, senha_hash, cpf FROM usuarios WHERE role = 'admin' AND status = 'aprovado' ORDER BY id`);
  if (!us.length) { console.error('❌ Nenhum usuário administrador no banco informado.'); process.exit(1); }

  const { rows: [t] } = await master.query(
    `INSERT INTO tenants (slug, nome, plano_id, status, plano_fim, db_url_enc) VALUES ($1,$2,$3,'ativo', NOW() + INTERVAL '10 years', $4)
     RETURNING id`, [slug, nome, plano, cifrar(url)]);
  for (const u of us) {
    await master.query(
      `INSERT INTO contas (tenant_id, usuario_tenant_id, role, nome, email, senha_hash) VALUES ($1,$2,'cliente',$3,$4,$5)
       ON CONFLICT DO NOTHING`, [t.id, u.id, u.nome, u.email, u.senha_hash]);
  }
  console.log(`✅ "${nome}" registrado (${slug}) com ${us.length} login(s) e os dados atuais.`);
  await antigo.end(); await master.end();
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
