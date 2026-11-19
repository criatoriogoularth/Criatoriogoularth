// db/masterPool.js — conexão com o banco MESTRE (clientes, logins, planos...).
require('dotenv').config();
const { Pool } = require('pg');

const url = process.env.MASTER_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('❌ MASTER_DATABASE_URL não definida. Veja o .env.example.');
  process.exit(1);
}

const master = new Pool({
  connectionString: url,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
  max: Number(process.env.MASTER_POOL_MAX || 5)
});
master.on('error', (e) => console.error('Erro no pool do banco mestre:', e.message));

module.exports = master;
