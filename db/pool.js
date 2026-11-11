// db/pool.js
require('dotenv').config();
const { Pool, types } = require('pg');

// CORREÇÃO: por padrão o driver converte colunas DATE em objetos Date (com fuso
// horário), o que pode "voltar um dia" dependendo do servidor. Aqui o DATE passa a
// chegar como texto puro "AAAA-MM-DD", exatamente o que o <input type=date> espera.
types.setTypeParser(1082, (v) => v);

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida. Crie um arquivo .env (veja .env.example).');
  process.exit(1);
}

// Provedores como Render/Heroku exigem SSL, mas com certificado não
// verificável publicamente — por isso rejectUnauthorized: false aqui.
// Isso ainda criptografa a conexão, só não valida a cadeia do certificado.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do Postgres:', err);
});

module.exports = pool;
