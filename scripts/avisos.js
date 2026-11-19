// scripts/avisos.js — manda os avisos de vencimento. Use no cron (1x por dia) se preferir
// não deixar o servidor fazer isso sozinho (AVISOS_AUTOMATICOS=false):
//   0 9 * * *  cd /opt/aviari && node scripts/avisos.js
require('dotenv').config();
const master = require('../db/masterPool');
const { rodarAvisos } = require('../lib/avisos');
rodarAvisos().then((n) => { console.log(`✅ ${n} aviso(s) enviado(s).`); return master.end(); })
  .catch((e) => { console.error('❌', e.message); process.exit(1); });
