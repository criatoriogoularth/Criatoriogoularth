// routes/mensagens.js
//
// Caixa de mensagens do site (reservas, dúvidas e contatos).
//   POST   /api/mensagens            (público)  visitante envia
//   GET    /api/mensagens            (admin)    lista (não lidas primeiro)
//   GET    /api/mensagens/resumo     (admin)    { naoLidas }
//   PUT    /api/mensagens/:id        (admin)    { lida }
//   POST   /api/mensagens/ler-todas  (admin)
//   DELETE /api/mensagens/:id        (admin)
const crypto = require('crypto');
const express = require('express');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { limparTexto } = require('../lib/sanitizar');

const router = express.Router();
const SITE_USER_ID = 1; // sistema single-user, mesmo padrão das rotas públicas

const saida = (r) => ({
  id: r.id, tipo: r.tipo, nome: r.nome, contato: r.contato, assunto: r.assunto, mensagem: r.mensagem,
  aveId: r.ave_id, aveNome: r.ave_nome, lida: r.lida, criadoEm: r.criado_em
});

// ---------- ENVIAR (público) ----------
router.post('/', asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.status(201).json({ ok: true }); // isca anti-robô

  const tipo = ['reserva', 'duvida', 'contato'].includes(b.tipo) ? b.tipo : 'contato';
  const nome = limparTexto(String(b.nome || '').trim().slice(0, 120));
  const contato = limparTexto(String(b.contato || '').trim().slice(0, 160));
  const assunto = limparTexto(String(b.assunto || '').trim().slice(0, 200));
  const mensagem = limparTexto(String(b.mensagem || '').trim().slice(0, 2000));

  if (nome.length < 2) return res.status(400).json({ error: 'Informe seu nome.' });
  if (contato.length < 5) return res.status(400).json({ error: 'Informe um WhatsApp/telefone ou e-mail para retornarmos.' });
  if (tipo !== 'reserva' && mensagem.length < 2) return res.status(400).json({ error: 'Escreva sua mensagem.' });

  // limite: no máximo 5 mensagens por hora por visitante
  const ip = crypto.createHash('sha1').update(String(req.ip || 'desconhecido')).digest('hex');
  const rec = await req.db.query(
    `SELECT COUNT(*)::int AS t FROM site_mensagens WHERE ip_hash = $1 AND criado_em > NOW() - INTERVAL '1 hour'`, [ip]
  );
  if (rec.rows[0].t >= 5) return res.status(429).json({ error: 'Você enviou várias mensagens seguidas. Tente de novo mais tarde.' });

  // o nome da ave vem do banco (não confia no que o navegador mandou)
  let aveId = null, aveNome = null;
  const idNum = parseInt(b.aveId, 10);
  if (Number.isInteger(idNum) && idNum > 0) {
    const a = await req.db.query('SELECT id, nome, anilha FROM aves WHERE id = $1 AND no_site = true', [idNum]);
    if (a.rows[0]) { aveId = a.rows[0].id; aveNome = a.rows[0].nome + (a.rows[0].anilha ? ` (${a.rows[0].anilha})` : ''); }
  }

  await req.db.query(
    `INSERT INTO site_mensagens (usuario_id, tipo, nome, contato, assunto, mensagem, ave_id, ave_nome, ip_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [SITE_USER_ID, tipo, nome, contato, assunto || null, mensagem || null, aveId, aveNome, ip]
  );
  res.status(201).json({ ok: true });
}));

// ---------- daqui para baixo: só administrador logado ----------
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { rows } = await req.db.query(
    'SELECT * FROM site_mensagens WHERE usuario_id = $1 ORDER BY lida ASC, criado_em DESC, id DESC LIMIT 200', [SITE_USER_ID]
  );
  res.json(rows.map(saida));
}));

router.get('/resumo', authMiddleware, asyncHandler(async (req, res) => {
  const { rows } = await req.db.query(
    'SELECT COUNT(*)::int AS t FROM site_mensagens WHERE usuario_id = $1 AND lida = false', [SITE_USER_ID]
  );
  res.json({ naoLidas: rows[0].t });
}));

router.post('/ler-todas', authMiddleware, asyncHandler(async (req, res) => {
  await req.db.query('UPDATE site_mensagens SET lida = true WHERE usuario_id = $1', [SITE_USER_ID]);
  res.json({ ok: true });
}));

router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (!/^\d{1,9}$/.test(req.params.id)) return res.status(404).json({ error: 'Mensagem não encontrada.' });
  await req.db.query('UPDATE site_mensagens SET lida = $1 WHERE id = $2 AND usuario_id = $3',
    [!!(req.body && req.body.lida), req.params.id, SITE_USER_ID]);
  res.json({ ok: true });
}));

router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (!/^\d{1,9}$/.test(req.params.id)) return res.status(404).json({ error: 'Mensagem não encontrada.' });
  await req.db.query('DELETE FROM site_mensagens WHERE id = $1 AND usuario_id = $2', [req.params.id, SITE_USER_ID]);
  res.json({ ok: true });
}));

module.exports = router;
