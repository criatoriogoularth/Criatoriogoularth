require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const avesRoutes = require('./routes/aves');
const anilhasRoutes = require('./routes/anilhas');
const reproducoesRoutes = require('./routes/reproducoes');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS restrito: em produção, defina FRONTEND_ORIGIN no .env com a URL real
// do site (ex: https://criatoriogoularth.com). Sem essa variável, libera
// tudo — ok para desenvolvimento local, mas troque antes de ir ao ar.
const origin = process.env.FRONTEND_ORIGIN || true;
app.use(cors({ origin }));

app.use(express.json({ limit: '10mb' })); // 50mb era exagero; 10mb já cobre upload de imagem em base64

// ===== API =====
app.use('/api/auth', authRoutes);
app.use('/api/aves', avesRoutes);
app.use('/api/anilhas', anilhasRoutes);
app.use('/api/reproducoes', reproducoesRoutes);
app.use('/api/config', configRoutes);

// ===== ARQUIVOS ESTÁTICOS (front-end) =====
// express.static já resolve caminhos com segurança (sem path traversal),
// diferente das rotas manuais com app.get('*.html', ...) da versão anterior.
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Qualquer rota não encontrada em /api devolve 404 em JSON, não HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota de API não encontrada.' });
});

// ===== HANDLER DE ERRO GLOBAL =====
// Precisa ser o ÚLTIMO app.use e ter 4 argumentos (é assim que o Express
// reconhece um error handler). Pega qualquer erro passado via next(err)
// pelas rotas (agora todas envolvidas em asyncHandler) e responde com
// JSON em vez de deixar a exceção subir e derrubar o processo inteiro,
// como aconteceu no crash de "invalid input syntax for type json".
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
