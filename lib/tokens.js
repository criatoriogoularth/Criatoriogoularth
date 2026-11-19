// lib/tokens.js — links de uso único (redefinir senha, confirmar e-mail). Só o hash vai para o banco.
const master = require('../db/masterPool');
const { hashToken, novoToken } = require('./crypto');

async function criarToken(contaId, tipo, minutos) {
  const token = novoToken(32);
  await master.query(
    `INSERT INTO tokens_conta (conta_id, tipo, token_hash, expira_em) VALUES ($1,$2,$3, NOW() + ($4 || ' minutes')::interval)`,
    [contaId, tipo, hashToken(token), String(minutos)]);
  return token;
}

// Usa o token UMA vez (atômico: dois cliques ao mesmo tempo não passam os dois). Devolve o id da conta ou null.
async function consumirToken(token, tipo) {
  if (!token || String(token).length < 20) return null;
  const { rows } = await master.query(
    `UPDATE tokens_conta SET usado_em = NOW()
      WHERE token_hash = $1 AND tipo = $2 AND usado_em IS NULL AND expira_em > NOW()
      RETURNING conta_id`, [hashToken(token), tipo]);
  return rows[0] ? rows[0].conta_id : null;
}

module.exports = { criarToken, consumirToken };
