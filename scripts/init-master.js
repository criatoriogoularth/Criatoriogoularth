// scripts/init-master.js — cria as tabelas do banco MESTRE e os planos iniciais.
//   node scripts/init-master.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const master = require('../db/masterPool');

(async () => {
  await master.query(fs.readFileSync(path.join(__dirname, '../db/master.sql'), 'utf8'));
  const { rows } = await master.query('SELECT id, nome FROM planos ORDER BY ordem');
  console.log('✅ Banco mestre pronto. Planos:', rows.map((p) => p.id).join(', '));
  await master.end();
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
