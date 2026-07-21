// scripts/create-admin.js
//
// Cria (ou atualiza a senha de) o usuário administrador.
// Uso:
//   node scripts/create-admin.js "seu@email.com" "SuaSenhaForte123!" "Seu Nome" "Seu Criatório"
//
// Rode isso UMA VEZ depois de criar o schema (db/schema.sql) e antes de
// tentar logar no sistema. Nunca deixe senha em texto puro no código —
// aqui ela é passada só na hora de rodar o script e vira hash bcrypt
// antes de tocar o banco.

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../db/pool');

async function main() {
  const [email, senha, nome, criatorio] = process.argv.slice(2);

  if (!email || !senha) {
    console.error('Uso: node scripts/create-admin.js <email> <senha> [nome] [criatorio]');
    process.exit(1);
  }
  if (senha.length < 8) {
    console.error('❌ Use uma senha com pelo menos 8 caracteres.');
    process.exit(1);
  }

  const hash = await bcrypt.hash(senha, 12);

  const { rows } = await pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash, role, status, criatorio)
     VALUES ($1, $2, $3, 'admin', 'aprovado', $4)
     ON CONFLICT (email) DO UPDATE SET senha_hash = $3
     RETURNING id, nome, email`,
    [nome || 'Administrador', email, hash, criatorio || null]
  );

  console.log('✅ Admin pronto:', rows[0]);
  await pool.end();
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
