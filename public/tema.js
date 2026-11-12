// tema.js — MOTOR DE TEMAS (modelos + dia/noite + cores editáveis)
// ============================================================
// Carregado no <head> de todas as páginas, ANTES da página aparecer, para
// não piscar o visual errado. Serve a dois "escopos" independentes:
//
//   • admin → o gerenciador (painel, cadastros, editores)
//   • site  → as páginas públicas (site-home, site-plantel...)
//
// Cada escopo tem o SEU modelo (ex.: gerenciador "Clássico" e site "Poente"),
// o seu modo dia/noite e as suas cores editadas. Tudo vira variáveis CSS na
// <html>, então qualquer tela que use var(--bg), var(--brass)... acompanha.
(function () {
  'use strict';

  // ---------- utilitários de cor ----------
  function rgb(hex) {
    var h = String(hex || '#000000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return { r: parseInt(h.substr(0, 2), 16) || 0, g: parseInt(h.substr(2, 2), 16) || 0, b: parseInt(h.substr(4, 2), 16) || 0 };
  }
  function hex2(n) { n = Math.max(0, Math.min(255, Math.round(n))); return (n < 16 ? '0' : '') + n.toString(16); }
  function mix(a, b, t) { // t=0 → a ; t=1 → b
    var x = rgb(a), y = rgb(b);
    return '#' + hex2(x.r + (y.r - x.r) * t) + hex2(x.g + (y.g - x.g) * t) + hex2(x.b + (y.b - x.b) * t);
  }
  function rgba(hex, al) { var c = rgb(hex); return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + al + ')'; }
  function triple(hex) { var c = rgb(hex); return c.r + ',' + c.g + ',' + c.b; }
  function luz(hex) { var c = rgb(hex); return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255; }

  // ---------- fontes ----------
  var URL_MONTSERRAT = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap';
  var FONTES_EXTRA = {
    elegante: { label: 'Elegante', titulo: "'Playfair Display', serif", texto: "'Lato', sans-serif",
      url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Lato:wght@400;500;600;700&display=swap' },
    moderno: { label: 'Moderno', titulo: "'Poppins', sans-serif", texto: "'Inter', sans-serif",
      url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap' }
  };

  // ---------- os modelos ----------
  // btnDeriva: o botão acompanha a cor de destaque quando o dono a edita.
  // navBg: se existir, o menu do site e a barra lateral ficam COLORIDOS (texto branco).
  var MODELOS = {
    classico: {
      nome: 'Clássico', emoji: '🌿', desc: 'Verde-floresta com dourado. O visual de sempre do criatório.',
      fonte: { titulo: "'Fraunces', serif", texto: "'Manrope', sans-serif", url: null },
      raio: 14, btnDeriva: true,
      noite: { bg: '#0d1a16', bgElevated: '#132621', bgElevated2: '#17302a', text: '#ece6d6', textMuted: '#9aa89e',
        accent: '#c7973f', accentSoft: '#e4c583', sage: '#5c9a7c', sageSoft: '#8fc3a8', onAccent: '#20170a',
        btnFrom: '#e4c583', btnTo: '#c7973f', line: 'rgba(199,151,63,0.22)', danger: '#c0594a', dangerText: '#e2988a',
        roseText: '#e2a898', infoText: '#5a8ab0', shade: '0,0,0', inputBg: 'rgba(0,0,0,0.35)', optionBg: '#1a2e28',
        glow1: 'rgba(199,151,63,0.06)', glow2: 'rgba(92,154,124,0.05)' },
      dia: { bg: '#f3eee4', bgElevated: '#fbf8f2', bgElevated2: '#ffffff', text: '#231f18', textMuted: '#5f6657',
        accent: '#9c701c', accentSoft: '#7d5a14', sage: '#3f7d61', sageSoft: '#2f6b4f', onAccent: '#ffffff',
        btnFrom: '#b8862c', btnTo: '#96691a', line: 'rgba(120,95,40,0.22)', danger: '#b3402f', dangerText: '#a3392b',
        roseText: '#9a4a38', infoText: '#2f5f86', shade: '70,60,40', inputBg: '#ffffff', optionBg: '#ffffff',
        glow1: 'rgba(156,112,28,0.07)', glow2: 'rgba(63,125,97,0.06)' }
    },

    ceu: {
      nome: 'Céu Claro', emoji: '☁️', desc: 'Azul-céu limpo e leve, painéis chapados e letras finas. Calmo e moderno.',
      fonte: { titulo: "'Montserrat', sans-serif", texto: "'Inter', sans-serif", url: URL_MONTSERRAT },
      raio: 8, btnDeriva: true,
      navBg: 'linear-gradient(180deg,{a},{a2})',
      noite: { bg: '#0c1822', bgElevated: '#112232', bgElevated2: '#173048', text: '#e4eff8', textMuted: '#8ea8bc',
        accent: '#5fa8d8', accentSoft: '#9fcdea', sage: '#4fc3a1', sageSoft: '#86dcc2', onAccent: '#06202f',
        btnFrom: '#8cc6ea', btnTo: '#5fa8d8', line: 'rgba(95,168,216,0.25)', danger: '#d0614f', dangerText: '#f0a090',
        roseText: '#f0a0b8', infoText: '#8cc6ea', shade: '0,0,0', inputBg: 'rgba(0,0,0,0.3)', optionBg: '#173048',
        glow1: 'rgba(95,168,216,0.10)', glow2: 'rgba(79,195,161,0.06)' },
      dia: { bg: '#eef4f9', bgElevated: '#ffffff', bgElevated2: '#f7fafc', text: '#1c2b38', textMuted: '#566b7c',
        accent: '#4f96c7', accentSoft: '#2a6c9b', sage: '#2fa084', sageSoft: '#1f7a63', onAccent: '#ffffff',
        btnFrom: '#4f96c7', btnTo: '#2f78ad', line: 'rgba(79,150,199,0.28)', danger: '#c2473a', dangerText: '#b23a2e',
        roseText: '#b0485f', infoText: '#2a6c9b', shade: '40,70,100', inputBg: '#ffffff', optionBg: '#ffffff',
        glow1: 'rgba(79,150,199,0.12)', glow2: 'rgba(47,160,132,0.07)' }
    },

    vibrante: {
      nome: 'Azul Vibrante', emoji: '💎', desc: 'Azul elétrico com ciano e toques de roxo. Chamativo e profissional.',
      fonte: { titulo: "'Montserrat', sans-serif", texto: "'Inter', sans-serif", url: URL_MONTSERRAT },
      raio: 14, btnDeriva: false,
      noite: { bg: '#060d22', bgElevated: '#0c1838', bgElevated2: '#122248', text: '#e9f0ff', textMuted: '#8fa3cf',
        accent: '#3a8dff', accentSoft: '#7dbbff', sage: '#2dd4a6', sageSoft: '#7ae8c9', onAccent: '#032033',
        btnFrom: '#4be3f7', btnTo: '#17b7e3', line: 'rgba(58,141,255,0.28)', danger: '#e0586a', dangerText: '#ff9aa6',
        roseText: '#f08fc0', infoText: '#7dbbff', shade: '0,0,0', inputBg: 'rgba(0,0,0,0.35)', optionBg: '#0c1838',
        navBg: 'linear-gradient(135deg,#0f3d99,#0a2570 60%,#1c1a6e)',
        glow1: 'rgba(124,58,237,0.22)', glow2: 'rgba(34,211,238,0.12)' },
      dia: { bg: '#f3f6fd', bgElevated: '#ffffff', bgElevated2: '#f6f8ff', text: '#0e1a3a', textMuted: '#55678e',
        accent: '#1769e8', accentSoft: '#0c4cb8', sage: '#10a37f', sageSoft: '#0b7d61', onAccent: '#04243a',
        btnFrom: '#3fe0f5', btnTo: '#13b8e0', line: 'rgba(23,105,232,0.22)', danger: '#d63a4a', dangerText: '#c42b3c',
        roseText: '#c0366b', infoText: '#0c4cb8', shade: '20,40,100', inputBg: '#ffffff', optionBg: '#ffffff',
        navBg: 'linear-gradient(135deg,#1e86ff 0%,#0b4fd6 55%,#1b2fa8 100%)',
        glow1: 'rgba(124,58,237,0.14)', glow2: 'rgba(34,211,238,0.12)' }
    },

    tropical: {
      nome: 'Tropical', emoji: '🦜', desc: 'Verde-água com laranja vivo. Alegre, quente e cheio de energia.',
      fonte: { titulo: "'Nunito', sans-serif", texto: "'Nunito', sans-serif",
        url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap' },
      raio: 20, btnDeriva: false,
      noite: { bg: '#07201c', bgElevated: '#0c2d27', bgElevated2: '#123a33', text: '#e3f6ef', textMuted: '#86b8aa',
        accent: '#22d3b6', accentSoft: '#76ead5', sage: '#6fdc8c', sageSoft: '#a5efb8', onAccent: '#2b1200',
        btnFrom: '#ffb347', btnTo: '#ff8a1f', line: 'rgba(34,211,182,0.26)', danger: '#e0614f', dangerText: '#ffa595',
        roseText: '#ff9fc0', infoText: '#76ead5', shade: '0,0,0', inputBg: 'rgba(0,0,0,0.3)', optionBg: '#0c2d27',
        navBg: 'linear-gradient(135deg,#0b6f66,#0a4f5e)',
        glow1: 'rgba(255,138,31,0.10)', glow2: 'rgba(34,211,182,0.10)' },
      dia: { bg: '#effaf6', bgElevated: '#ffffff', bgElevated2: '#f6fdfa', text: '#0f2e27', textMuted: '#4b6f64',
        accent: '#0f9d8a', accentSoft: '#08705f', sage: '#2fa866', sageSoft: '#1f7f4b', onAccent: '#2b1200',
        btnFrom: '#ffb347', btnTo: '#ff8a1f', line: 'rgba(15,157,138,0.26)', danger: '#cf4a3a', dangerText: '#bb3b2c',
        roseText: '#c23f6a', infoText: '#0b6f8a', shade: '10,70,60', inputBg: '#ffffff', optionBg: '#ffffff',
        navBg: 'linear-gradient(135deg,#12b5a0,#0b8a9a)',
        glow1: 'rgba(255,138,31,0.10)', glow2: 'rgba(15,157,138,0.10)' }
    },

    poente: {
      nome: 'Pôr do Sol', emoji: '🌅', desc: 'Roxo, magenta e coral como um fim de tarde. Ousado e elegante.',
      fonte: { titulo: "'Playfair Display', serif", texto: "'Lato', sans-serif", url: FONTES_EXTRA.elegante.url },
      raio: 16, btnDeriva: false,
      noite: { bg: '#140a26', bgElevated: '#1e1139', bgElevated2: '#291850', text: '#f7ecff', textMuted: '#bda5d9',
        accent: '#ff5c9a', accentSoft: '#ffa8cb', sage: '#52d6a0', sageSoft: '#8eeac4', onAccent: '#ffffff',
        btnFrom: '#f0307f', btnTo: '#a21cc9', line: 'rgba(255,92,154,0.28)', danger: '#e5535f', dangerText: '#ff9aa2',
        roseText: '#ffa8cb', infoText: '#c4a6ff', shade: '0,0,0', inputBg: 'rgba(0,0,0,0.35)', optionBg: '#1e1139',
        navBg: 'linear-gradient(120deg,#4a1a8c 0%,#a3207f 55%,#f0603d 100%)',
        glow1: 'rgba(255,92,154,0.16)', glow2: 'rgba(255,180,84,0.10)' },
      dia: { bg: '#fff5ee', bgElevated: '#ffffff', bgElevated2: '#fffaf7', text: '#2b1238', textMuted: '#785a88',
        accent: '#d01f6a', accentSoft: '#9e1252', sage: '#2f9e76', sageSoft: '#1f7a59', onAccent: '#ffffff',
        btnFrom: '#e0267b', btnTo: '#a21cc9', line: 'rgba(208,31,106,0.24)', danger: '#c9403d', dangerText: '#b3332f',
        roseText: '#a3124f', infoText: '#6b3fb5', shade: '90,40,70', inputBg: '#ffffff', optionBg: '#ffffff',
        navBg: 'linear-gradient(120deg,#4a1a8c 0%,#a3207f 55%,#f0603d 100%)',
        glow1: 'rgba(240,96,61,0.10)', glow2: 'rgba(162,28,201,0.08)' }
    }
  };

  var CAMPOS = [
    { chave: 'bg', label: 'Fundo principal' },
    { chave: 'bgElevated', label: 'Fundo dos cards' },
    { chave: 'accent', label: 'Cor de destaque' },
    { chave: 'text', label: 'Texto principal' },
    { chave: 'textMuted', label: 'Texto secundário' },
    { chave: 'sage', label: 'Cor positiva (sucesso)' }
  ];

  var ATTRS = ['data-modelo', 'data-theme', 'data-nav', 'data-side'];
  var VARS = ['--bg', '--bg-elevated', '--bg-elevated-2', '--text', '--text-muted', '--brass', '--brass-soft', '--brass-dim',
    '--line', '--accent-rgb', '--sage', '--sage-soft', '--sage-rgb', '--danger', '--danger-text', '--rose-text', '--info-text',
    '--on-brass', '--btn-from', '--btn-to', '--shade', '--input-bg', '--option-bg', '--shadow', '--radius', '--font-titulo',
    '--font-texto', '--glow-1', '--glow-2', '--nav-bg', '--side-bg', '--t-text', '--t-muted', '--t-brass', '--t-brass-soft',
    '--t-brass-dim', '--t-line', '--t-accent-rgb', '--nav-fg'];

  // ---------- paleta final = modelo + cores editadas pelo dono ----------
  function paleta(modeloId, modo, over) {
    var m = MODELOS[modeloId] || MODELOS.classico;
    var noite = modo !== 'dia';
    var p = Object.assign({}, noite ? m.noite : m.dia);
    over = over || {};
    if (over.bg) p.bg = over.bg;
    if (over.bgElevated) {
      p.bgElevated = over.bgElevated;
      p.bgElevated2 = mix(over.bgElevated, noite ? '#ffffff' : '#000000', 0.06);
      p.optionBg = over.bgElevated;
    }
    if (over.text) p.text = over.text;
    if (over.textMuted) p.textMuted = over.textMuted;
    if (over.accent) {
      var a = over.accent;
      p.accent = a;
      p.accentSoft = noite ? mix(a, '#ffffff', 0.45) : mix(a, '#000000', 0.25);
      p.line = rgba(a, noite ? 0.22 : 0.28);
      p.glow1 = rgba(a, 0.08);
      if (m.btnDeriva) {
        p.btnFrom = noite ? mix(a, '#ffffff', 0.4) : mix(a, '#ffffff', 0.1);
        p.btnTo = noite ? a : mix(a, '#000000', 0.12);
        p.onAccent = luz(p.btnTo) > 0.5 ? '#1a1208' : '#ffffff';
      }
    }
    if (over.sage) {
      p.sage = over.sage;
      p.sageSoft = noite ? mix(over.sage, '#ffffff', 0.4) : mix(over.sage, '#000000', 0.2);
    }
    var nav = p.navBg || m.navBg || null;
    if (nav) nav = nav.replace(/\{a\}/g, p.accent).replace(/\{a2\}/g, mix(p.accent, '#000000', 0.14));
    p._nav = nav;
    return p;
  }

  function resolverFonte(modeloId, fonteChave) {
    var m = MODELOS[modeloId] || MODELOS.classico;
    if (fonteChave && FONTES_EXTRA[fonteChave]) return FONTES_EXTRA[fonteChave];
    return m.fonte;
  }

  // ---------- gera o mapa de variáveis CSS ----------
  function variaveis(modeloId, modo, over, fonteChave) {
    var m = MODELOS[modeloId] || MODELOS.classico;
    var noite = modo !== 'dia';
    var p = paleta(modeloId, modo, over);
    var f = resolverFonte(modeloId, fonteChave);
    var dim = rgba(p.accent, noite ? 0.28 : 0.35);
    var v = {
      '--bg': p.bg, '--bg-elevated': p.bgElevated, '--bg-elevated-2': p.bgElevated2,
      '--text': p.text, '--text-muted': p.textMuted,
      '--brass': p.accent, '--brass-soft': p.accentSoft, '--brass-dim': dim, '--line': p.line,
      '--accent-rgb': triple(p.accent),
      '--sage': p.sage, '--sage-soft': p.sageSoft, '--sage-rgb': triple(p.sage),
      '--danger': p.danger, '--danger-text': p.dangerText, '--rose-text': p.roseText, '--info-text': p.infoText,
      '--on-brass': p.onAccent, '--btn-from': p.btnFrom, '--btn-to': p.btnTo,
      '--shade': p.shade, '--input-bg': p.inputBg, '--option-bg': p.optionBg,
      '--shadow': '0 10px 30px -18px rgba(' + p.shade + ',' + (noite ? '.6' : '.45') + ')',
      '--radius': m.raio + 'px',
      '--font-titulo': f.titulo, '--font-texto': f.texto,
      '--glow-1': p.glow1, '--glow-2': p.glow2,
      '--nav-bg': p._nav || 'var(--bg-elevated)',
      '--side-bg': p._nav ? p._nav.replace(/linear-gradient\([^,]+,/, 'linear-gradient(180deg,') : 'linear-gradient(180deg,var(--bg-elevated),var(--bg) 85%)',
      '--nav-fg': p._nav ? '#ffffff' : p.textMuted,
      '--t-text': p.text, '--t-muted': p.textMuted, '--t-brass': p.accent, '--t-brass-soft': p.accentSoft,
      '--t-brass-dim': dim, '--t-line': p.line, '--t-accent-rgb': triple(p.accent)
    };
    return { vars: v, colorida: !!p._nav, claro: !noite, fonte: f };
  }

  function carregarFonte(url) {
    if (!url || !document.head) return;
    var existente = document.querySelectorAll('link[data-tema-fonte]');
    for (var i = 0; i < existente.length; i++) if (existente[i].getAttribute('href') === url) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = url; l.setAttribute('data-tema-fonte', '1');
    document.head.appendChild(l);
  }

  // ---------- aplica no documento inteiro ----------
  // cfg = { modelo, modo: 'noite'|'dia', over: { noite:{..}, dia:{..} }, fonte }
  function aplicar(cfg) {
    var root = document.documentElement;
    var modelo = MODELOS[cfg.modelo] ? cfg.modelo : 'classico';
    var modo = cfg.modo === 'dia' ? 'dia' : 'noite';
    var over = (cfg.over && cfg.over[modo]) || {};
    var limpo = modelo === 'classico' && modo === 'noite' && !Object.keys(over).length && !cfg.fonte;

    VARS.forEach(function (k) { root.style.removeProperty(k); });
    ATTRS.forEach(function (a) { root.removeAttribute(a); });
    root.style.removeProperty('color-scheme');

    if (limpo) { root.setAttribute('data-modelo', 'classico'); return; }

    var r = variaveis(modelo, modo, over, cfg.fonte);
    Object.keys(r.vars).forEach(function (k) { root.style.setProperty(k, r.vars[k]); });
    root.setAttribute('data-modelo', modelo);
    if (r.claro) root.setAttribute('data-theme', 'claro');
    if (r.colorida) { root.setAttribute('data-nav', 'cor'); root.setAttribute('data-side', 'cor'); }
    root.style.setProperty('color-scheme', r.claro ? 'light' : 'dark');
    carregarFonte(r.fonte.url);
  }

  // aplica as variáveis só em um elemento (pré-visualização do editor)
  function aplicarEm(el, modelo, modo, over, fonteChave) {
    var r = variaveis(modelo, modo, over, fonteChave);
    Object.keys(r.vars).forEach(function (k) { el.style.setProperty(k, r.vars[k]); });
    el.setAttribute('data-colorida', r.colorida ? '1' : '0');
    el.setAttribute('data-modelo', modelo);
    carregarFonte(r.fonte.url);
    return r;
  }

  // ---------- escopo da página ----------
  var pagina = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var ehSite = /^site-/.test(pagina) && !/^site-(editor|editar)/.test(pagina);
  var escopo = ehSite ? 'site' : 'admin';

  function ler(chave) { try { return JSON.parse(localStorage.getItem(chave)); } catch (e) { return null; } }
  function gravar(chave, obj) { try { localStorage.setItem(chave, JSON.stringify(obj)); } catch (e) {} }

  // ---------- ADMIN ----------
  function cfgAdminDoCache() {
    var c = ler('tema_admin');
    if (c && c.modelo) return c;
    var legado = null; try { legado = localStorage.getItem('tema'); } catch (e) {}
    return { modelo: 'classico', modo: legado === 'claro' ? 'dia' : 'noite', over: {}, fonte: null };
  }

  function sincronizarAdmin(pers) {
    pers = pers || {};
    var cacheAtual = cfgAdminDoCache();
    var t = (pers.temas && pers.temas.admin) || {};
    var modelo = MODELOS[t.modelo] ? t.modelo : 'classico';
    var modo = pers.tema ? (pers.tema === 'claro' ? 'dia' : 'noite') : cacheAtual.modo;
    var cfg = { modelo: modelo, modo: modo, over: (t.cores && t.cores[modelo]) || {}, fonte: t.fonte || null };
    gravar('tema_admin', cfg);
    try { localStorage.setItem('tema', modo === 'dia' ? 'claro' : 'escuro'); } catch (e) {}
    aplicar(cfg);
    return cfg;
  }

  function definirModoAdmin(modo) {
    var cfg = cfgAdminDoCache();
    cfg.modo = (modo === 'dia' || modo === 'claro') ? 'dia' : 'noite';
    gravar('tema_admin', cfg);
    try { localStorage.setItem('tema', cfg.modo === 'dia' ? 'claro' : 'escuro'); } catch (e) {}
    aplicar(cfg);
    return cfg.modo;
  }

  // ---------- SITE ----------
  function normalizarSite(pers) {
    pers = pers || {};
    var t = pers.temas && pers.temas.site;
    if (t && t.modelo) {
      var modelo = MODELOS[t.modelo] ? t.modelo : 'classico';
      return { modelo: modelo, modoPadrao: t.modoPadrao || 'noite', mostrarBotao: t.mostrarBotao !== false,
        over: (t.cores && t.cores[modelo]) || {}, fonte: t.fonte || null };
    }
    // legado: antes só existiam temaCores/temaFonte (tema escuro editável)
    var over = {};
    var c = pers.temaCores;
    if (c) {
      var n = {};
      if (c.bg) n.bg = c.bg;
      if (c.bgElevated) n.bgElevated = c.bgElevated;
      if (c.brass) n.accent = c.brass;
      if (c.text) n.text = c.text;
      if (c.textMuted) n.textMuted = c.textMuted;
      if (c.sageSoft) n.sage = c.sageSoft;
      over = { noite: n };
    }
    return { modelo: 'classico', modoPadrao: 'noite', mostrarBotao: true, over: over,
      fonte: (pers.temaFonte && pers.temaFonte !== 'padrao') ? pers.temaFonte : null };
  }

  function modoSite(cfg) {
    var pref = null; try { pref = localStorage.getItem('site_modo'); } catch (e) {}
    if (pref === 'dia' || pref === 'noite') return pref;
    if (cfg && cfg.modoPadrao === 'auto') {
      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'dia' : 'noite';
    }
    return cfg && cfg.modoPadrao === 'dia' ? 'dia' : 'noite';
  }

  function liberarSite() {
    var s = document.getElementById('tema-aguarda');
    if (s) s.remove();
  }

  var cfgSiteAtual = null;

  function aplicarSite(cfg) {
    cfgSiteAtual = cfg;
    aplicar({ modelo: cfg.modelo, modo: modoSite(cfg), over: cfg.over, fonte: cfg.fonte });
    atualizarBotaoModoSite();
  }

  function sincronizarSite(pers) {
    var cfg = normalizarSite(pers);
    gravar('tema_site', cfg);
    aplicarSite(cfg);
    liberarSite();
    montarBotaoModoSite(cfg);
    return cfg;
  }

  function alternarModoSite() {
    var cfg = cfgSiteAtual || ler('tema_site') || { modelo: 'classico', over: {} };
    var novo = modoSite(cfg) === 'dia' ? 'noite' : 'dia';
    try { localStorage.setItem('site_modo', novo); } catch (e) {}
    aplicarSite(cfg);
  }

  function atualizarBotaoModoSite() {
    var b = document.getElementById('btn-modo-site');
    if (!b || !cfgSiteAtual) return;
    var dia = modoSite(cfgSiteAtual) === 'dia';
    b.textContent = dia ? '🌙' : '☀️';
    b.title = dia ? 'Mudar para o modo noite' : 'Mudar para o modo dia';
    b.setAttribute('aria-label', b.title);
  }

  function montarBotaoModoSite(cfg) {
    if (cfg.mostrarBotao === false) {
      var velho = document.getElementById('btn-modo-site');
      if (velho) velho.remove();
      return;
    }
    function criar() {
      var alvo = document.querySelector('.nav-buttons');
      if (!alvo) return;
      if (!document.getElementById('btn-modo-site')) {
        var b = document.createElement('button');
        b.type = 'button'; b.id = 'btn-modo-site'; b.className = 'btn-modo-site';
        b.onclick = alternarModoSite;
        alvo.insertBefore(b, alvo.firstChild);
      }
      atualizarBotaoModoSite();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', criar); else criar();
  }

  // ---------- aplicação imediata (antes da página aparecer) ----------
  try {
    if (escopo === 'site') {
      var cs = ler('tema_site');
      if (cs && cs.modelo) { cfgSiteAtual = cs; aplicarSite(cs); }
      else {
        // 1ª visita: sem cache, esconde por instantes até saber o modelo (evita piscar o visual errado)
        var st = document.createElement('style');
        st.id = 'tema-aguarda'; st.textContent = 'html{visibility:hidden}';
        document.head.appendChild(st);
        setTimeout(liberarSite, 1500);
      }
    } else {
      aplicar(cfgAdminDoCache());
    }
  } catch (e) { liberarSite(); }

  // ---------- API pública ----------
  window.TemaEngine = {
    MODELOS: MODELOS, CAMPOS: CAMPOS, FONTES_EXTRA: FONTES_EXTRA, escopo: escopo,
    paleta: paleta, variaveis: variaveis, aplicar: aplicar, aplicarEm: aplicarEm, carregarFonte: carregarFonte,
    sincronizarAdmin: sincronizarAdmin, definirModoAdmin: definirModoAdmin, cfgAdminDoCache: cfgAdminDoCache,
    sincronizarSite: sincronizarSite, normalizarSite: normalizarSite, alternarModoSite: alternarModoSite,
    modoSite: modoSite, liberarSite: liberarSite,
    util: { mix: mix, rgba: rgba, triple: triple, luz: luz }
  };
})();
