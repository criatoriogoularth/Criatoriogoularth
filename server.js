require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const tenants = require('./db/tenants');
const authMiddleware = require('./middleware/auth');
const { resolverSite, exigirSite, ehRotaPublica, acharTenantPorHost } = require('./middleware/tenant');

const authRoutes = require('./routes/auth');
const cadastroRoutes = require('./routes/cadastro');
const donoRoutes = require('./routes/dono');
const contaRoutes = require('./routes/conta');
const sugestoesRoutes = require('./routes/sugestoes');
const backupRoutes = require('./routes/backup');
const webhooksRoutes = require('./routes/webhooks');
const internoRoutes = require('./routes/interno');
const { rodarAvisos } = require('./lib/avisos');
const master = require('./db/masterPool');
const avesRoutes = require('./routes/aves');
const anilhasRoutes = require('./routes/anilhas');
const reproducoesRoutes = require('./routes/reproducoes');
const configRoutes = require('./routes/config');
const ancestraisRoutes = require('./routes/ancestrais');
const visitasRoutes = require('./routes/visitas');
const mensagensRoutes = require('./routes/mensagens');

for (const v of ['JWT_SECRET', 'APP_KEY']) {
  if (!process.env[v]) { console.error(`❌ ${v} não definida. Veja o .env.example.`); process.exit(1); }
}

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

app.set('trust proxy', 1);   // atrás do Render/Cloudflare/Caddy: IP real do visitante

// Cabeçalhos de segurança básicos (o Referer completo continua indo para o próprio site: é ele que
// diz de qual criatório é uma imagem em /c/nome/).
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  });
  next();
});

const origin = process.env.FRONTEND_ORIGIN || true;
app.use(cors({ origin }));
app.use(express.json({ limit: '30mb' }));

// ===== API =====
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// 1) Se a requisição é de um site público, descobre qual criatório é.
app.use('/api', resolverSite);

// 2) PORTEIRO: tudo na API exige login, EXCETO o que é aberto de propósito.
//    (Se um dia alguém criar uma rota nova e esquecer o login, ela já nasce protegida.)
const ABERTAS = [/^\/api\/auth\/(login|esqueci|redefinir|confirmar-email)$/, /^\/api\/cadastro\//, /^\/api\/webhooks\//, /^\/api\/interno\//];
app.use('/api', (req, res, next) => {
  const u = req.originalUrl.split('?')[0];
  if (ABERTAS.some((r) => r.test(u))) return next();
  if (ehRotaPublica(req)) return exigirSite(req, res, next);
  if (/^\/api\/dono(\/|$)/.test(u)) return authMiddleware.dono(req, res, next);
  if (/^\/api\/(auth|conta|sugestoes)(\/|$)/.test(u) || u === '/api/backup/exportar') return authMiddleware.livre(req, res, next);
  return authMiddleware(req, res, () => {
    // Plano "só site" tem gerenciador reduzido: cadastro de aves e árvore, sem reprodução.
    if (req.plano && req.plano.gerenciador !== 'completo' && /^\/api\/reproducoes(\/|$)/.test(u)) {
      return res.status(403).json({ error: 'Este recurso não faz parte do seu plano.', codigo: 'FORA_DO_PLANO' });
    }
    next();
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/cadastro', cadastroRoutes);
app.use('/api/dono', donoRoutes);
app.use('/api/conta', contaRoutes);
app.use('/api/sugestoes', sugestoesRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/interno', internoRoutes);
app.use('/api/aves', avesRoutes);
app.use('/api/anilhas', anilhasRoutes);
app.use('/api/reproducoes', reproducoesRoutes);
app.use('/api/config', configRoutes);
app.use('/api/ancestrais', ancestraisRoutes);
app.use('/api/visitas', visitasRoutes);
app.use('/api/mensagens', mensagensRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'Rota de API não encontrada.' }));

// ===== SITES POR CAMINHO:  /c/NOME/...  (usado nos testes e quando não há domínio) =====
const semSite = (res) => res.status(404).type('html').send('<h1>Site não encontrado</h1>');
app.get('/c/:slug', async (req, res, next) => {
  try {
    if (!(await tenants.porSlug(req.params.slug))) return semSite(res);
    res.redirect(`/c/${encodeURIComponent(req.params.slug)}/site-home.html`);
  } catch (e) { next(e); }
});
app.use('/c/:slug', async (req, res, next) => {
  try {
    if (!(await tenants.porSlug(req.params.slug))) return semSite(res);
    next();
  } catch (e) { next(e); }
}, express.static(PUBLIC));

// ===== ARQUIVOS ESTÁTICOS E PÁGINA INICIAL =====
// Em subdomínio ou domínio próprio, a página inicial é o SITE do criatório; no resto, o login.
app.get('/', async (req, res, next) => {
  try {
    const t = await acharTenantPorHost(req);
    res.sendFile(path.join(PUBLIC, t ? 'site-home.html' : 'login.html'));
  } catch (e) { next(e); }
});
app.use(express.static(PUBLIC, { index: false }));

app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

process.on('unhandledRejection', (err) => { console.error('Unhandled rejection:', err); });

if (require.main === module) {
  // Garante que as tabelas do banco mestre existem/estão atualizadas (tudo é "IF NOT EXISTS").
  const sqlMestre = require('fs').readFileSync(path.join(__dirname, 'db/master.sql'), 'utf8');
  master.query(sqlMestre).then(() => {
    app.listen(PORT, () => console.log(`🚀 Aviari rodando na porta ${PORT}`));
    // Avisos de vencimento: a cada 6 horas (cada aviso sai uma vez só). Desligue com AVISOS_AUTOMATICOS=false.
    if (process.env.AVISOS_AUTOMATICOS !== 'false') {
      const rodar = () => rodarAvisos().then((n) => n && console.log(`📧 ${n} aviso(s) de vencimento enviado(s)`)).catch((e) => console.error('Avisos:', e.message));
      setTimeout(rodar, 2 * 60 * 1000);
      setInterval(rodar, 6 * 60 * 60 * 1000);
    }
  }).catch((e) => { console.error('❌ Não foi possível preparar o banco mestre:', e.message); process.exit(1); });
}
module.exports = app;
