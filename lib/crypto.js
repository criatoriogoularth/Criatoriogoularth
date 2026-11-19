// lib/crypto.js — cifra (AES-256-GCM), HMAC e tokens.
// APP_KEY (no .env) protege: o endereço do banco de cada cliente e o CPF.
// Se perder a APP_KEY, esses dados não podem ser recuperados — guarde uma cópia.
const crypto = require('crypto');

function chave(nome) {
  const k = process.env.APP_KEY;
  if (!k || k.length < 32) throw new Error('APP_KEY ausente ou curta demais (use 32+ caracteres).');
  return crypto.createHash('sha256').update(nome + ':' + k).digest();
}

function cifrar(texto) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', chave('enc'), iv);
  const enc = Buffer.concat([c.update(String(texto), 'utf8'), c.final()]);
  return 'v1:' + Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}

function decifrar(s) {
  if (!s || !s.startsWith('v1:')) throw new Error('Valor cifrado inválido.');
  const buf = Buffer.from(s.slice(3), 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', chave('enc'), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
}

const hmac = (t) => crypto.createHmac('sha256', chave('mac')).update(String(t)).digest('hex');
const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
const novoToken = (n = 24) => crypto.randomBytes(n).toString('base64url');

module.exports = { cifrar, decifrar, hmac, hashToken, novoToken };
