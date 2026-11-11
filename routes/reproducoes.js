// routes/reproducoes.js
//
// O front-end trabalha com um objeto "achatado" (femeaNome, femeaAnilha,
// totalOvos, filhotes, status...), igual fazia no localStorage. Aqui a
// gente guarda status numa coluna própria e o resto inteiro dentro de
// "dados" (JSONB) — e devolve tudo já achatado de volta, pra não precisar
// mexer no HTML.
const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
router.use(authMiddleware);

function achatar(row) {
  // id/status/criadoEm vêm DEPOIS do spread: assim um valor antigo guardado dentro de
  // "dados" (ex.: vindo de um backup importado) nunca sobrescreve o valor real da linha.
  return { ...row.dados, id: row.id, status: row.status, criadoEm: row.criado_em };
}

// CORREÇÃO (bug "tento finalizar e continua ativa"): o formulário tem dois campos
// que significam a mesma coisa — "Status" (Ativo/Finalizado) e "Finalizada" (Sim/Não) —
// e eles podiam ficar contraditórios. Aqui o servidor garante que andem juntos.
function normalizarFinalizacao(status, dados) {
  const finalizada = dados && dados.finalizada;
  if (finalizada === 'Sim') return { status: 'Finalizado', finalizada: 'Sim' };
  if (status === 'Finalizado') return { status: 'Finalizado', finalizada: 'Sim' };
  if (finalizada === 'Não' || status === 'Ativo') return { status: 'Ativo', finalizada: 'Não' };
  return { status: status || null, finalizada };
}

router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM reproducoes WHERE usuario_id = $1 ORDER BY id DESC',
    [req.user.id]
  );
  res.json(rows.map(achatar));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM reproducoes WHERE id = $1 AND usuario_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Registro não encontrado.' });
  res.json(achatar(rows[0]));
}));

router.post('/', asyncHandler(async (req, res) => {
  const { status, id: _id, criadoEm: _c, criado_em: _c2, ...dados } = req.body || {};
  const norm = normalizarFinalizacao(status, dados);
  if (norm.finalizada !== undefined) dados.finalizada = norm.finalizada;
  const { rows } = await pool.query(
    'INSERT INTO reproducoes (usuario_id, dados, status) VALUES ($1,$2,$3) RETURNING *',
    [req.user.id, JSON.stringify(dados), norm.status || 'Ativo']
  );
  res.status(201).json(achatar(rows[0]));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { status, id: _id, criadoEm: _c, criado_em: _c2, ...dadosNovos } = req.body || {};

  const atual = await pool.query(
    'SELECT * FROM reproducoes WHERE id=$1 AND usuario_id=$2',
    [req.params.id, req.user.id]
  );
  if (!atual.rows[0]) return res.status(404).json({ error: 'Registro não encontrado.' });

  const dadosMesclados = { ...atual.rows[0].dados, ...dadosNovos };

  // Quem foi enviado agora manda: se veio "finalizada", ela decide; se veio só "status",
  // o status decide; se não veio nenhum dos dois, vale o que já estava salvo.
  const refFinalizada = dadosNovos.finalizada !== undefined
    ? dadosNovos.finalizada
    : (status !== undefined ? undefined : dadosMesclados.finalizada);
  const norm = normalizarFinalizacao(
    dadosNovos.finalizada !== undefined ? undefined : (status !== undefined ? status : atual.rows[0].status),
    { finalizada: refFinalizada }
  );
  if (norm.finalizada !== undefined) dadosMesclados.finalizada = norm.finalizada;

  const { rows } = await pool.query(
    'UPDATE reproducoes SET dados = $1, status = COALESCE($2, status) WHERE id=$3 AND usuario_id=$4 RETURNING *',
    [JSON.stringify(dadosMesclados), norm.status, req.params.id, req.user.id]
  );
  res.json(achatar(rows[0]));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM reproducoes WHERE id=$1 AND usuario_id=$2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Registro não encontrado.' });
  res.json({ ok: true });
}));

module.exports = router;
