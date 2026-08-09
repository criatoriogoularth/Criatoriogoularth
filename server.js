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
const visitasRoutes = require('./routes/visitas');
const torneiosRoutes = require('./routes/torneios');

const app = express();
const PORT = process.env.PORT || 3000;

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
app.use('/api/visitas', visitasRoutes);
app.use('/api/torneios', torneiosRoutes);

// ===== ARQUIVOS ESTÁTICOS =====
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota de API não encontrada.' });
});

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