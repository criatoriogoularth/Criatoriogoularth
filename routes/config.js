// routes/config.js
//
// Substitui as antigas chaves do localStorage (site_personalizacao,
// site_especies, site_noticias, site_fotos, site_videos, site_banner,
// site_conteudo) por um par chave/valor guardado no Postgres.
//
// Front-end antigo:
//   localStorage.setItem('site_noticias', JSON.stringify(noticias))
// Front-end novo:
//   await fetch('/api/config/site_noticias', { method:'PUT', ... body: JSON.stringify({ valor: noticias }) })

const express = require('express');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const { limites } = require('../lib/planos');
const { limparProfundo } = require('../lib/sanitizar');

const router = express.Router();

// Chaves permitidas — evita que a rota vire um key-value store arbitrário
const CHAVES_VALIDAS = new Set([
  'site_personalizacao', 'site_especies', 'site_noticias',
  'site_fotos', 'site_videos', 'site_banner', 'site_banners', 'site_conteudo',
  'especies_aves', 'dados_criatorio', 'cert_config'
]);

function validarChave(req, res, next) {
  if (!CHAVES_VALIDAS.has(req.params.chave)) {
    return res.status(400).json({ error: 'Chave de configuração desconhecida.' });
  }
  next();
}

// Campos do cadastro do criatório que podem aparecer no site/certificado. CPF, CEP, endereço e data da licença NUNCA saem.
const DADOS_CRIATORIO_PUBLICOS = ['nomeCriatorio', 'registro', 'responsavel', 'categoria', 'site', 'whatsapp', 'facebook',
  'twitter', 'instagram', 'youtube', 'fone', 'celular', 'email', 'cidade', 'uf'];

// ---------- LEITURA PÚBLICA (o site do criatório precisa ler sem login) ----------
router.get('/publico/:chave', validarChave, asyncHandler(async (req, res) => {
  // Sistema é single-user: sempre lê do usuário id=1 (o admin/dono do criatório)
  const { rows } = await req.db.query(
    'SELECT valor FROM site_config WHERE usuario_id = $1 AND chave = $2',
    [1, req.params.chave]
  );
  const chave = req.params.chave;
  let valor = rows[0] ? rows[0].valor : null;

  // O cadastro do criatório tem dados PESSOAIS (CPF, endereço). O site só recebe o que é de contato público.
  if (chave === 'dados_criatorio') {
    if (!valor || typeof valor !== 'object') return res.json(null);
    const publico = {};
    for (const k of DADOS_CRIATORIO_PUBLICOS) if (valor[k] !== undefined) publico[k] = valor[k];
    return res.json(publico);
  }

  if (chave === 'site_personalizacao') {
    // Criatório novo, ainda sem personalização: usa o nome cadastrado (nunca um nome fixo).
    if (!valor && req.siteTenant) valor = { nome: req.siteTenant.nome };
    // Plano sem impressão = site com proteção de imagens (marca d'água, sem botão direito/arrastar/imprimir).
    if (req.sitePlano && req.sitePlano.imprimir === false) valor = { ...(valor || {}), protegerImagens: true };
  }
  res.json(valor);
}));

// ---------- LEITURA COMPLETA (só o dono do criatório, no gerenciador) ----------
// Traz tudo, inclusive CPF e endereço. Usa SEMPRE o banco do login (nunca o do endereço do site).
router.get('/:chave', authMiddleware, validarChave, asyncHandler(async (req, res) => {
  const { rows } = await req.db.query(
    'SELECT valor FROM site_config WHERE usuario_id = $1 AND chave = $2', [1, req.params.chave]);
  res.json(rows[0] ? rows[0].valor : null);
}));

// ---------- ESCRITA (só o admin logado) ----------
// Galeria de fotos e banners: quantidade limitada pelo plano; imagens novas não podem ser enormes.
// O limite vale para ADICIONAR: quem já tem mais (conta antiga) continua podendo editar e remover.
const MAX_IMG_CHARS = 2500000;   // ~1,8 MB de imagem em base64
async function validarLista(req, valor) {
  const chave = req.params.chave;
  if (!Array.isArray(valor)) return 'Formato inválido.';
  const lim = limites(req.plano, req.tenant);
  const max = chave === 'site_fotos' ? lim.galeria : lim.banners;
  const { rows } = await req.db.query('SELECT valor FROM site_config WHERE usuario_id = 1 AND chave = $1', [chave]);
  const atual = rows[0] && Array.isArray(rows[0].valor) ? rows[0].valor.length : 0;
  if (valor.length > atual) {
    if (valor.length > max) {
      return chave === 'site_fotos'
        ? `Seu plano permite até ${max} fotos na galeria. Remova alguma ou peça mais espaço.`
        : `Você pode ter no máximo ${max} banners.`;
    }
    const novos = valor.slice(atual);
    if (novos.some((it) => JSON.stringify(it || {}).length > MAX_IMG_CHARS)) {
      return 'Uma das imagens é grande demais. Use uma foto menor (até cerca de 1,8 MB).';
    }
  }
  return null;
}

router.put('/:chave', authMiddleware, validarChave, asyncHandler(async (req, res) => {
  const { valor: valorBruto } = req.body || {};
  if (valorBruto === undefined) return res.status(400).json({ error: 'Campo "valor" é obrigatório.' });
  const valor = limparProfundo(valorBruto);   // nada de código no banco

  // Plano sem site público não edita o site.
  if (req.params.chave.startsWith('site_') && req.plano && !req.plano.site) {
    return res.status(403).json({ error: 'O seu plano não inclui site público.', codigo: 'FORA_DO_PLANO' });
  }

  if (req.params.chave === 'site_fotos' || req.params.chave === 'site_banners') {
    const erro = await validarLista(req, valor);
    if (erro) return res.status(400).json({ error: erro });
  }

  // CORREÇÃO: a leitura pública (rota acima) sempre busca usuario_id = 1,
  // fixo, porque o site é single-user. Antes esta rota gravava com
  // req.user.id (o id de quem está logado) — se esse id não fosse 1,
  // a gravação ia para uma linha que a leitura pública nunca olhava, e
  // as mudanças pareciam "não salvar" ou voltar ao estado antigo depois
  // de recarregar a página. Agora escreve sempre na mesma linha (id=1)
  // que a leitura usa, mas continua exigindo login (authMiddleware) para
  // gravar.
  const { rows } = await req.db.query(
    `INSERT INTO site_config (usuario_id, chave, valor, atualizado_em)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (usuario_id, chave)
     DO UPDATE SET valor = $3, atualizado_em = NOW()
     RETURNING valor`,
    [1, req.params.chave, JSON.stringify(valor)]
  );
  res.json(rows[0].valor);
}));

module.exports = router;
