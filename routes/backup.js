// routes/backup.js — exportar e restaurar o criatório INTEIRO (aves com fotos/documentos, anilhas,
// reproduções, ancestrais, configuração do site e mensagens).
//
//   GET  /api/backup/exportar          baixa tudo num arquivo (funciona mesmo com plano vencido: os dados são seus)
//   POST /api/backup/iniciar           apaga os dados atuais deste criatório (pede confirmação) e abre a restauração
//   POST /api/backup/lote              recebe um pedaço do arquivo ({ tabela, linhas })
//   POST /api/backup/finalizar         acerta os contadores
//
// Serve também para mudar um cliente de servidor ou de plano: exporta num lugar, restaura no outro.
const express = require('express');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { limparProfundo } = require('../lib/sanitizar');

const router = express.Router();

// ordem de gravação; "pag" = tem coluna id para paginar
const TABELAS = [
  { nome: 'anilhas', id: true }, { nome: 'aves', id: true }, { nome: 'reproducoes', id: true },
  { nome: 'ancestrais', id: true }, { nome: 'site_config', id: false }, { nome: 'site_mensagens', id: true }
];
const NOMES = new Set(TABELAS.map((t) => t.nome));
const restaurando = new Map();            // tenantId -> início (só quem abriu a restauração pode enviar lotes)
const DUAS_HORAS = 2 * 60 * 60 * 1000;

router.get('/exportar', authMiddleware.livre, asyncHandler(async (req, res) => {
  if (!req.tenant) return res.status(403).json({ error: 'Sem criatório.' });
  const hoje = new Date().toISOString().slice(0, 10);
  res.set({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="aviari-${req.tenant.slug}-${hoje}.json"`,
    'Cache-Control': 'no-store'
  });
  res.write(`{"formato":"aviari-criatorio","versao":1,"exportadoEm":${JSON.stringify(new Date().toISOString())},`
    + `"criatorio":${JSON.stringify({ nome: req.tenant.nome, slug: req.tenant.slug })},"tabelas":{`);

  for (let t = 0; t < TABELAS.length; t++) {
    const { nome, id } = TABELAS[t];
    res.write((t ? ',' : '') + JSON.stringify(nome) + ':[');
    let primeiro = true;
    if (id) {
      // de 40 em 40 para não encher a memória (cada ave pode ter fotos e documentos)
      let ultimo = 0;
      for (;;) {
        const { rows } = await req.db.query(
          `SELECT * FROM ${nome} WHERE usuario_id = $1 AND id > $2 ORDER BY id LIMIT 40`, [req.user.id, ultimo]);
        if (!rows.length) break;
        for (const r of rows) { res.write((primeiro ? '' : ',') + JSON.stringify(r)); primeiro = false; ultimo = r.id; }
      }
    } else {
      const { rows } = await req.db.query(`SELECT * FROM ${nome} WHERE usuario_id = $1`, [req.user.id]);
      for (const r of rows) { res.write((primeiro ? '' : ',') + JSON.stringify(r)); primeiro = false; }
    }
    res.write(']');
  }
  res.end('}}');
}));

router.post('/iniciar', authMiddleware, asyncHandler(async (req, res) => {
  if (!req.body || req.body.confirmacao !== 'SUBSTITUIR') {
    return res.status(400).json({ error: 'Para restaurar é preciso confirmar: isso APAGA os dados atuais deste criatório.' });
  }
  const cx = await req.db.connect();
  try {
    await cx.query('BEGIN');
    for (const t of [...TABELAS].reverse()) await cx.query(`DELETE FROM ${t.nome} WHERE usuario_id = $1`, [req.user.id]);
    await cx.query('COMMIT');
  } catch (e) { await cx.query('ROLLBACK').catch(() => {}); throw e; } finally { cx.release(); }
  restaurando.set(req.tenant.id, Date.now());
  res.json({ ok: true });
}));

router.post('/lote', authMiddleware, asyncHandler(async (req, res) => {
  const { tabela, linhas } = req.body || {};
  if (!NOMES.has(tabela)) return res.status(400).json({ error: 'Tabela desconhecida.' });
  const inicio = restaurando.get(req.tenant.id);
  if (!inicio || Date.now() - inicio > DUAS_HORAS) return res.status(409).json({ error: 'Nenhuma restauração aberta. Comece de novo.' });
  if (!Array.isArray(linhas) || linhas.length === 0 || linhas.length > 300) return res.status(400).json({ error: 'Lote inválido.' });

  // texto limpo (nada de código), e tudo passa a pertencer a ESTE criatório
  const limpas = linhas.map((l) => ({ ...limparProfundo(l && typeof l === 'object' ? l : {}), usuario_id: req.user.id }));
  try {
    await req.db.query(`INSERT INTO ${tabela} SELECT * FROM jsonb_populate_recordset(NULL::${tabela}, $1::jsonb)`, [JSON.stringify(limpas)]);
  } catch (e) {
    return res.status(400).json({ error: 'Este lote não pôde ser gravado: ' + String(e.message).slice(0, 160) });
  }
  res.json({ ok: true, gravadas: limpas.length });
}));

router.post('/finalizar', authMiddleware, asyncHandler(async (req, res) => {
  restaurando.delete(req.tenant.id);
  for (const t of TABELAS.filter((x) => x.id)) {
    await req.db.query(`SELECT setval(pg_get_serial_sequence('${t.nome}', 'id'), GREATEST(1, (SELECT COALESCE(MAX(id), 1) FROM ${t.nome})))`);
  }
  res.json({ ok: true });
}));

module.exports = router;
