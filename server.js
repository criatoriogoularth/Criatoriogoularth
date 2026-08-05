require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const avesRoutes = require('./routes/aves');
const anilhasRoutes = require('./routes/anilhas');
const reproducoesRoutes = require('./routes/reproducoes');
const configRoutes = require('./routes/config');
const ancestraisRoutes = require('./routes/ancestrais');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS restrito: em produção, defina FRONTEND_ORIGIN no .env com a URL real
// do site (ex: https://criatoriogoularth.com). Sem essa variável, libera
// tudo — ok para desenvolvimento local, mas troque antes de ir ao ar.
const origin = process.env.FRONTEND_ORIGIN || true;
app.use(cors({ origin }));

app.use(express.json({ limit: '10mb' }));

// ===== API =====
app.use('/api/auth', authRoutes);
app.use('/api/aves', avesRoutes);
app.use('/api/anilhas', anilhasRoutes);
app.use('/api/reproducoes', reproducoesRoutes);
app.use('/api/config', configRoutes);
app.use('/api/ancestrais', ancestraisRoutes);

// ===== ARQUIVOS ESTÁTICOS (front-end) =====
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Qualquer rota não encontrada em /api devolve 404 em JSON, não HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota de API não encontrada.' });
});

// Handler de erro global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});