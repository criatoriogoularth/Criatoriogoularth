// db/pool.js
require('dotenv').config();
const { Pool } = require('pg');

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
