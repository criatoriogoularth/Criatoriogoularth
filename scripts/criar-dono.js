// scripts/criar-dono.js — cria (ou troca a senha de) o DONO da plataforma.
//   node scripts/criar-dono.js "seu@email.com" "SenhaForte123!" "Seu Nome"
require('dotenv').config();
const bcrypt = require('bcrypt');
const master = require('../db/masterPool');

(async () => {
  const [email, senha, nome] = process.argv.slice(2);
  if (!email || !senha || senha.length < 8) {
    console.error('Uso: node scripts/criar-dono.js <email> <senha com 8+ caracteres> [nome]');
    process.exit(1);
  }
  const hash = await bcrypt.hash(senha, 12);
  const { rows } = await master.query(
    `INSERT INTO contas (tenant_id, role, nome, email, senha_hash) VALUES (NULL, 'dono', $1, $2, $3)
     ON CONFLICT (LOWER(email)) DO UPDATE SET senha_hash = $3 WHERE contas.role = 'dono'
     RETURNING id, email`, [nome || 'Dono', email.toLowerCase(), hash]);
  if (!rows[0]) { console.error('❌ Já existe uma conta de criador com esse e-mail. Use outro.'); process.exit(1); }
  console.log('✅ Dono pronto:', rows[0].email);
  await master.end();
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
