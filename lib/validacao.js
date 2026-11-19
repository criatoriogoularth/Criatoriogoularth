// lib/validacao.js
const RESERVADOS = new Set([
  'www', 'app', 'api', 'admin', 'dono', 'suporte', 'mail', 'email', 'ftp', 'smtp', 'ajuda', 'help',
  'blog', 'loja', 'login', 'painel', 'dashboard', 'cadastro', 'conta', 'contato', 'status', 'static',
  'cdn', 'assets', 'teste', 'test', 'demo', 'aviari', 'root', 'sistema', 'c', 'dev', 'staging'
]);

function slugValido(s) {
  s = String(s || '').toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(s)) return false;   // 3–40, sem hífen nas pontas
  if (s.includes('--')) return false;
  return !RESERVADOS.has(s);
}

function emailValido(e) {
  return typeof e === 'string' && e.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

function soDigitos(s) { return String(s || '').replace(/\D/g, ''); }

function cpfValido(cpf) {
  const c = soDigitos(cpf);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(c[i]) * (t + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== Number(c[t])) return false;
  }
  return true;
}

// domínio próprio: letras, números, hífen e pontos; pelo menos 1 ponto
function dominioValido(d) {
  d = String(d || '').toLowerCase();
  return d.length <= 253 && /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(d);
}

module.exports = { RESERVADOS, slugValido, emailValido, soDigitos, cpfValido, dominioValido };
