// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// Limite simples de tentativas por IP, em memória (reinicia com o servidor).
// Para produção real com mais tráfego, troque por um limitador com Redis.
const tentativas = new Map();
const MAX_TENTATIVAS = 5;
const JANELA_MS = 15 * 60 * 1000; // 15 minutos

function bloqueado(ip) {
  const registro = tentativas.get(ip);
  if (!registro) return false;
  if (Date.now() - registro.inicio > JANELA_MS) {
    tentativas.delete(ip);
    return false;
  }
  return registro.count >= MAX_TENTATIVAS;
}

function registrarFalha(ip) {
  const registro = tentativas.get(ip) || { count: 0, inicio: Date.now() };
  registro.count += 1;
  tentativas.set(ip, registro);
}

function limparFalhas(ip) {
  tentativas.delete(ip);
}

router.post('/login', asyncHandler(async (req, res) => {
  const ip = req.ip;
  if (bloqueado(ip)) {
    return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
  }

  const { identificador, senha } = req.body; // identificador = e-mail ou CPF
  if (!identificador || !senha) {
    return res.status(400).json({ error: 'Informe e-mail/CPF e senha.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 OR cpf = $1 LIMIT 1',
      [identificador.trim()]
    );
    const usuario = rows[0];

    // Mesma mensagem genérica em ambos os casos, para não revelar se o
    // e-mail existe ou não (evita enumeração de contas).
    if (!usuario) {
      registrarFalha(ip);
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const ok = await bcrypt.compare(senha, usuario.senha_hash);
    if (!ok) {
      registrarFalha(ip);
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    if (usuario.status !== 'aprovado') {
      return res.status(403).json({ error: 'Usuário ainda não aprovado.' });
    }

    limparFalhas(ip);

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, role: usuario.role, criatorio: usuario.criatorio },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        criatorio: usuario.criatorio
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno ao autenticar.' });
  }
}));

// Confirma se o token ainda é válido e devolve os dados do usuário logado.
// O front-end usa isso no lugar do antigo "auth-check.js".
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome, email, role, criatorio, status FROM usuarios WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}));

// Troca de senha de verdade: confere a senha atual com bcrypt antes de
// gravar a nova (também com hash). Substitui o antigo "trocarSenha()" que
// só comparava com a string fixa 'admin123' guardada no localStorage.
router.put('/senha', authMiddleware, asyncHandler(async (req, res) => {
  const { senhaAtual, novaSenha } = req.body || {};

  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' });
  }
  if (novaSenha.length < 8) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });
  }

  try {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [req.user.id]);
    const usuario = rows[0];
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const ok = await bcrypt.compare(senhaAtual, usuario.senha_hash);
    if (!ok) return res.status(401).json({ error: 'Senha atual incorreta.' });

    const novoHash = await bcrypt.hash(novaSenha, 12);
    await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [novoHash, req.user.id]);

    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao trocar senha:', err);
    res.status(500).json({ error: 'Erro interno ao trocar senha.' });
  }
}));

module.exports = router;
