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
    },

    // ---------------------------------------------------------------
    // VELHO OESTE — couro, madeira e papel envelhecido, dourado de xerife
    // ---------------------------------------------------------------
    faroeste: {
      nome: 'Velho Oeste', emoji: '🤠', desc: 'Couro, madeira e papel de cartaz "procurado", com dourado de xerife. Poeira, saloon e duelo ao meio-dia.',
      fonte: { titulo: "'Rye', serif", texto: "'Roboto Slab', serif",
        url: 'https://fonts.googleapis.com/css2?family=Rye&family=Roboto+Slab:wght@400;500;600;700&display=swap' },
      raio: 6, btnDeriva: true,
      navBg: 'linear-gradient(180deg,#6e4626,#46290f)',
      noite: { bg: '#1a110a', bgElevated: '#2a1a10', bgElevated2: '#36231a', text: '#f3e4c4', textMuted: '#b9a07a',
        accent: '#d9a441', accentSoft: '#f0cd85', sage: '#8fa860', sageSoft: '#b4c98a', onAccent: '#2a1604',
        btnFrom: '#e8b954', btnTo: '#b9791f', line: 'rgba(217,164,65,0.28)', danger: '#c0462b', dangerText: '#e88a72',
        roseText: '#e0a08a', infoText: '#8fb3c9', shade: '0,0,0', inputBg: 'rgba(0,0,0,0.35)', optionBg: '#2a1a10',
        glow1: 'rgba(217,164,65,0.08)', glow2: 'rgba(192,70,43,0.08)' },
      dia: { bg: '#efe0bd', bgElevated: '#f8edd2', bgElevated2: '#fff7e1', text: '#2e1d0e', textMuted: '#6b5238',
        accent: '#9a4a1c', accentSoft: '#7a3511', sage: '#5d7a32', sageSoft: '#46601f', onAccent: '#ffffff',
        btnFrom: '#b45a22', btnTo: '#8a3a12', line: 'rgba(110,70,30,0.32)', danger: '#b03a22', dangerText: '#a23220',
        roseText: '#9a4630', infoText: '#2f5a78', shade: '80,50,20', inputBg: '#fff9ea', optionBg: '#fff9ea',
        glow1: 'rgba(154,74,28,0.10)', glow2: 'rgba(93,122,50,0.08)' }
    },

    // ---------------------------------------------------------------
    // CÓDIGO VERDE (estilo Matrix) — preto, verde-neon e fonte de terminal.
    // No site público ganha a chuva de código animada (ver iniciarChuva).
    // ---------------------------------------------------------------
    matrix: {
      nome: 'Código Verde', emoji: '🟢', desc: 'Estilo Matrix: chuva de código verde sobre o preto, brilho neon e letras de terminal.',
      fonte: { titulo: "'Share Tech Mono', monospace", texto: "'IBM Plex Mono', monospace",
        url: 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap' },
      raio: 3, btnDeriva: true,
      noite: { bg: '#000a04', bgElevated: '#031409', bgElevated2: '#06210f', text: '#c8ffd8', textMuted: '#5fbf83',
        accent: '#00ff66', accentSoft: '#7dffaa', sage: '#00e5c3', sageSoft: '#7ff5e0', onAccent: '#00200b',
        btnFrom: '#3dff8a', btnTo: '#00c94d', line: 'rgba(0,255,102,0.30)', danger: '#ff4d5e', dangerText: '#ff9aa4',
        roseText: '#ff9ac0', infoText: '#6fd6ff', shade: '0,0,0', inputBg: 'rgba(0,255,102,0.05)', optionBg: '#031409',
        glow1: 'rgba(0,255,102,0.10)', glow2: 'rgba(0,180,80,0.08)' },
      dia: { bg: '#e9f4ec', bgElevated: '#f8fdf9', bgElevated2: '#ffffff', text: '#06301a', textMuted: '#3f6b50',
        accent: '#008a3a', accentSoft: '#00692c', sage: '#00897b', sageSoft: '#00695c', onAccent: '#ffffff',
        btnFrom: '#00a844', btnTo: '#007a30', line: 'rgba(0,120,50,0.30)', danger: '#c62828', dangerText: '#b71c1c',
        roseText: '#ad1457', infoText: '#01579b', shade: '10,60,30', inputBg: '#ffffff', optionBg: '#ffffff',
        glow1: 'rgba(0,160,70,0.10)', glow2: 'rgba(0,137,123,0.08)' }
    },

    // ---------------------------------------------------------------
    // CORRIDA DE RUA (estilo Velozes e Furiosos) — asfalto, laranja nitro,
    // azul neon e faixa quadriculada. O menu e o rodapé ganham a faixa.
    // ---------------------------------------------------------------
    velozes: {
      nome: 'Corrida de Rua', emoji: '🏎️', desc: 'Estilo Velozes e Furiosos: asfalto preto, laranja nitro, azul neon e faixa quadriculada. Pura velocidade.',
      fonte: { titulo: "'Racing Sans One', sans-serif", texto: "'Barlow', sans-serif",
        url: 'https://fonts.googleapis.com/css2?family=Racing+Sans+One&family=Barlow:wght@400;500;600;700;800&display=swap' },
      raio: 8, btnDeriva: false,
      navBg: 'linear-gradient(90deg,#ff4a1c,#19b5ff) left bottom 16px / 100% 3px no-repeat, repeating-conic-gradient(#f4f4f4 0% 25%, #15151d 0% 50%) left bottom / 16px 16px repeat-x, linear-gradient(180deg,#20202c,#0b0b11)',
      noite: { bg: '#09090e', bgElevated: '#14141c', bgElevated2: '#1d1d28', text: '#f4f4f8', textMuted: '#9c9cb0',
        accent: '#ff4a1c', accentSoft: '#ff9a7a', sage: '#1fb6ff', sageSoft: '#7fd6ff', onAccent: '#ffffff',
        btnFrom: '#ff6a2b', btnTo: '#e5260f', line: 'rgba(255,74,28,0.30)', danger: '#ff2d55', dangerText: '#ff8aa0',
        roseText: '#ff8ab8', infoText: '#7fd6ff', shade: '0,0,0', inputBg: 'rgba(255,255,255,0.05)', optionBg: '#14141c',
        glow1: 'rgba(255,74,28,0.16)', glow2: 'rgba(25,181,255,0.12)' },
      dia: { bg: '#eef0f4', bgElevated: '#ffffff', bgElevated2: '#f6f7fa', text: '#13141a', textMuted: '#5b5f70',
        accent: '#e03a10', accentSoft: '#b22c08', sage: '#0a8fd0', sageSoft: '#06689a', onAccent: '#ffffff',
        btnFrom: '#ff5a24', btnTo: '#d92a0a', line: 'rgba(224,58,16,0.28)', danger: '#d01b3f', dangerText: '#b8123a',
        roseText: '#b01462', infoText: '#06689a', shade: '30,30,50', inputBg: '#ffffff', optionBg: '#ffffff',
        glow1: 'rgba(224,58,16,0.10)', glow2: 'rgba(10,143,208,0.10)' }
    },

    // ---------------------------------------------------------------
    // NINJA DA FOLHA (estilo Naruto) — laranja chakra, azul-marinho, mangá
    // ---------------------------------------------------------------
    ninja: {
      nome: 'Ninja da Folha', emoji: '🍥', desc: 'Estilo Naruto: laranja chakra e azul-marinho, letras de mangá, shurikens e folhas caindo, kanji flutuando.',
      fonte: { titulo: "'Dela Gothic One', sans-serif", texto: "'M PLUS Rounded 1c', sans-serif",
        url: 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=M+PLUS+Rounded+1c:wght@400;500;700;800&display=swap' },
      raio: 10, btnDeriva: false,
      navBg: 'linear-gradient(90deg,#ff8a1f,#ffc27a,#ff8a1f) left bottom / 100% 4px no-repeat, linear-gradient(180deg,#1b2650,#0d1224)',
      noite: { bg: '#0c0f1c', bgElevated: '#161b30', bgElevated2: '#20284a', text: '#f5f1e8', textMuted: '#a7b0cc',
        accent: '#ff8a1f', accentSoft: '#ffc27a', sage: '#4db8ff', sageSoft: '#9ad6ff', onAccent: '#1a0d00',
        btnFrom: '#ff9d3a', btnTo: '#e5620a', line: 'rgba(255,138,31,0.32)', danger: '#ff4d5e', dangerText: '#ff9aa4',
        roseText: '#ff9ac0', infoText: '#9ad6ff', shade: '0,0,0', inputBg: 'rgba(255,255,255,0.05)', optionBg: '#161b30',
        glow1: 'rgba(255,138,31,0.14)', glow2: 'rgba(77,184,255,0.12)' },
      dia: { bg: '#fff1dc', bgElevated: '#fffaf1', bgElevated2: '#ffffff', text: '#1a2142', textMuted: '#59628a',
        accent: '#e8650a', accentSoft: '#b84a00', sage: '#1e78c8', sageSoft: '#155a96', onAccent: '#ffffff',
        btnFrom: '#ff8a1f', btnTo: '#d9540a', line: 'rgba(232,101,10,0.32)', danger: '#c62828', dangerText: '#b71c1c',
        roseText: '#ad1457', infoText: '#155a96', shade: '40,30,60', inputBg: '#ffffff', optionBg: '#ffffff',
        glow1: 'rgba(232,101,10,0.10)', glow2: 'rgba(30,120,200,0.08)' }
    },

    // ---------------------------------------------------------------
    // ESFERAS DO DRAGÃO (estilo Dragon Ball) — laranja de guerreiro, azul, ouro
    // ---------------------------------------------------------------
    dragao: {
      nome: 'Esferas do Dragão', emoji: '🐉', desc: 'Estilo Dragon Ball: laranja de guerreiro, azul profundo, aura dourada, esferas flutuando e raios de energia.',
      fonte: { titulo: "'Bangers', cursive", texto: "'Rubik', sans-serif",
        url: 'https://fonts.googleapis.com/css2?family=Bangers&family=Rubik:wght@400;500;600;700;800&display=swap' },
      raio: 12, btnDeriva: false,
      navBg: 'linear-gradient(90deg,#1d4ed8,#60a5fa,#1d4ed8) left bottom / 100% 5px no-repeat, linear-gradient(180deg,#e8660a,#b94400)',
      noite: { bg: '#081a45', bgElevated: '#0f2a6b', bgElevated2: '#163a8c', text: '#fff8e0', textMuted: '#a9bce8',
        accent: '#ffb800', accentSoft: '#ffe27a', sage: '#38d0ff', sageSoft: '#8fe6ff', onAccent: '#2b1400',
        btnFrom: '#ffcc33', btnTo: '#ff7a00', line: 'rgba(255,184,0,0.34)', danger: '#ff4d5e', dangerText: '#ff9aa4',
        roseText: '#ff9ac0', infoText: '#8fe6ff', shade: '0,10,40', inputBg: 'rgba(255,255,255,0.07)', optionBg: '#0f2a6b',
        glow1: 'rgba(255,184,0,0.16)', glow2: 'rgba(56,208,255,0.12)' },
      dia: { bg: '#fff4c8', bgElevated: '#ffffff', bgElevated2: '#fff0b0', text: '#10224f', textMuted: '#4a5b8c',
        accent: '#e35d00', accentSoft: '#b34600', sage: '#0e8fc2', sageSoft: '#0a6c93', onAccent: '#ffffff',
        btnFrom: '#ff8a1a', btnTo: '#d94f00', line: 'rgba(227,93,0,0.32)', danger: '#c62828', dangerText: '#b71c1c',
        roseText: '#ad1457', infoText: '#0a6c93', shade: '80,50,0', inputBg: '#ffffff', optionBg: '#ffffff',
        glow1: 'rgba(255,170,0,0.16)', glow2: 'rgba(14,143,194,0.10)' }
    },

    // ---------------------------------------------------------------
    // RIO DAS ARARAS (estilo desenho "Rio") — azul-arara, amarelo, rosa de carnaval
    // ---------------------------------------------------------------
    rio: {
      nome: 'Rio das Araras', emoji: '🦜', desc: 'Estilo desenho Rio: azul-arara, amarelo e rosa de carnaval, araras voando, penas e confete caindo.',
      fonte: { titulo: "'Lilita One', sans-serif", texto: "'Baloo 2', sans-serif",
        url: 'https://fonts.googleapis.com/css2?family=Lilita+One&family=Baloo+2:wght@400;500;600;700;800&display=swap' },
      raio: 18, btnDeriva: false,
      navBg: 'linear-gradient(90deg,#ffc400,#ff3d8b,#1fd6a3,#ffc400) left bottom / 100% 5px no-repeat, linear-gradient(180deg,#1f6fe5,#0f4fb8)',
      noite: { bg: '#06243a', bgElevated: '#0b3556', bgElevated2: '#10456e', text: '#f2fbff', textMuted: '#9cc7dd',
        accent: '#ffc400', accentSoft: '#ffe36b', sage: '#1fd6a3', sageSoft: '#7fead0', onAccent: '#2a2000',
        btnFrom: '#ffd84a', btnTo: '#f5a300', line: 'rgba(255,196,0,0.30)', danger: '#ff4d7a', dangerText: '#ff9ab5',
        roseText: '#ff7eb6', infoText: '#8fd3ff', shade: '0,20,40', inputBg: 'rgba(255,255,255,0.07)', optionBg: '#0b3556',
        glow1: 'rgba(255,196,0,0.12)', glow2: 'rgba(255,61,139,0.12)' },
      dia: { bg: '#e6f7ff', bgElevated: '#ffffff', bgElevated2: '#f1fbff', text: '#0b2a4a', textMuted: '#46708f',
        accent: '#0f62d6', accentSoft: '#0a4aa8', sage: '#0a9b72', sageSoft: '#07775a', onAccent: '#ffffff',
        btnFrom: '#2a85f5', btnTo: '#0b52c4', line: 'rgba(15,98,214,0.28)', danger: '#d81b60', dangerText: '#ad1457',
        roseText: '#c2185b', infoText: '#0a4aa8', shade: '10,60,110', inputBg: '#ffffff', optionBg: '#ffffff',
        glow1: 'rgba(255,196,0,0.14)', glow2: 'rgba(255,61,139,0.10)' }
    },

    // ---------------------------------------------------------------
    // MAR DOS PIRATAS (estilo One Piece) — vermelho de aventura, amarelo palha, azul do mar
    // ---------------------------------------------------------------
    pirata: {
      nome: 'Mar dos Piratas', emoji: '🏴‍☠️', desc: 'Estilo One Piece: vermelho de aventura, amarelo de chapéu de palha e azul do mar, com navio, gaivotas, ondas e caveira pirata.',
      fonte: { titulo: "'Pirata One', cursive", texto: "'Nunito', sans-serif",
        url: 'https://fonts.googleapis.com/css2?family=Pirata+One&family=Nunito:wght@400;600;700;800&display=swap' },
      raio: 10, btnDeriva: false,
      navBg: 'linear-gradient(90deg,#f4c430,#ffe08a,#f4c430) left bottom / 100% 4px no-repeat, linear-gradient(180deg,#d62f3a,#9c1c27)',
      noite: { bg: '#06172e', bgElevated: '#0d2a4d', bgElevated2: '#143a66', text: '#fdf6e3', textMuted: '#9fbad6',
        accent: '#f4c430', accentSoft: '#ffe08a', sage: '#33c3d6', sageSoft: '#8fe3ee', onAccent: '#2a1a00',
        btnFrom: '#ffd54a', btnTo: '#e0a100', line: 'rgba(244,196,48,0.30)', danger: '#ff5a5f', dangerText: '#ff9a9d',
        roseText: '#ff9ac0', infoText: '#8fe3ee', shade: '0,10,30', inputBg: 'rgba(255,255,255,0.07)', optionBg: '#0d2a4d',
        glow1: 'rgba(244,196,48,0.12)', glow2: 'rgba(51,195,214,0.12)' },
      dia: { bg: '#fdf0cf', bgElevated: '#fff9e8', bgElevated2: '#ffffff', text: '#1a2a44', textMuted: '#58698a',
        accent: '#c8281f', accentSoft: '#9c1c14', sage: '#0a8aa6', sageSoft: '#066a82', onAccent: '#ffffff',
        btnFrom: '#ef4444', btnTo: '#b91c1c', line: 'rgba(200,40,31,0.30)', danger: '#c62828', dangerText: '#b71c1c',
        roseText: '#ad1457', infoText: '#066a82', shade: '60,40,10', inputBg: '#fffdf5', optionBg: '#fffdf5',
        glow1: 'rgba(244,196,48,0.20)', glow2: 'rgba(10,138,166,0.10)' }
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

    if (limpo) { root.setAttribute('data-modelo', 'classico'); atualizarEfeitos('classico', modo); return; }

    var r = variaveis(modelo, modo, over, cfg.fonte);
    Object.keys(r.vars).forEach(function (k) { root.style.setProperty(k, r.vars[k]); });
    root.setAttribute('data-modelo', modelo);
    if (r.claro) root.setAttribute('data-theme', 'claro');
    if (r.colorida) { root.setAttribute('data-nav', 'cor'); root.setAttribute('data-side', 'cor'); }
    root.style.setProperty('color-scheme', r.claro ? 'light' : 'dark');
    carregarFonte(r.fonte.url);
    atualizarEfeitos(modelo, modo);
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

  // marca o escopo na <html>: o CSS dos modelos usa isso para aplicar
  // efeitos decorativos só no site público (o gerenciador fica limpo e leve)
  document.documentElement.setAttribute('data-escopo', escopo);

  // ---------- EFEITOS ANIMADOS (só no site público) ----------
  // Hoje: a "chuva de código" do modelo Código Verde. É um <canvas> fixo ATRÁS
  // do conteúdo (z-index -1, sem capturar cliques), que:
  //   • usa a cor de destaque do tema (acompanha se o dono editar a cor)
  //   • pausa quando a aba fica escondida (não gasta bateria)
  //   • não liga se o visitante pediu "reduzir movimento" no aparelho
  var chuva = { canvas: null, ctx: null, raf: 0, ultimo: 0, cols: [], tam: 16, w: 0, h: 0, modo: 'noite', timerResize: 0, ligado: false, querer: false };
  var GLIFOS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789'.split('');

  function reduzMovimento() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  function chuvaDimensionar() {
    var c = chuva.canvas; if (!c) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    chuva.w = window.innerWidth; chuva.h = window.innerHeight;
    c.width = Math.round(chuva.w * dpr); c.height = Math.round(chuva.h * dpr);
    chuva.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    chuva.tam = chuva.w < 600 ? 14 : 16;
    var n = Math.ceil(chuva.w / chuva.tam), antigo = chuva.cols;
    chuva.cols = [];
    for (var i = 0; i < n; i++) chuva.cols.push(antigo[i] !== undefined ? antigo[i] : Math.floor(Math.random() * 40) - 25);
  }

  function chuvaCor() {
    var c = '';
    try { c = getComputedStyle(document.documentElement).getPropertyValue('--brass').trim(); } catch (e) {}
    return c || '#00ff66';
  }

  function chuvaQuadro(t) {
    chuva.raf = requestAnimationFrame(chuvaQuadro);
    if (t - chuva.ultimo < 55) return;          // ~18 quadros/s: suave e econômico
    chuva.ultimo = t;
    var ctx = chuva.ctx, tam = chuva.tam;
    ctx.globalCompositeOperation = 'destination-out';   // apaga aos poucos → cria o rastro
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    ctx.fillRect(0, 0, chuva.w, chuva.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = tam + 'px monospace';
    var cor = chuvaCor();
    for (var i = 0; i < chuva.cols.length; i++) {
      var y = chuva.cols[i];
      if (y >= 0) {
        ctx.fillStyle = Math.random() < 0.07 ? '#e6fff0' : cor;   // de vez em quando uma "cabeça" brilhante
        ctx.fillText(GLIFOS[Math.floor(Math.random() * GLIFOS.length)], i * tam, y * tam);
      }
      chuva.cols[i] = (y * tam > chuva.h && Math.random() > 0.975) ? -Math.floor(Math.random() * 20) : y + 1;
    }
  }

  function chuvaVisibilidade() {
    if (!chuva.ligado) return;
    if (document.hidden) { cancelAnimationFrame(chuva.raf); chuva.raf = 0; }
    else if (!chuva.raf) chuva.raf = requestAnimationFrame(chuvaQuadro);
  }
  function chuvaRedimensionou() {
    clearTimeout(chuva.timerResize);
    chuva.timerResize = setTimeout(chuvaDimensionar, 150);
  }

  function chuvaEstilo(modo) {
    if (chuva.canvas) chuva.canvas.style.opacity = modo === 'dia' ? '0.16' : '0.34';
  }

  function iniciarChuva(modo) {
    chuva.modo = modo; chuva.querer = true;
    if (chuva.canvas) { chuvaEstilo(modo); return; }
    if (reduzMovimento()) return;
    function montar() {
      if (!chuva.querer || chuva.canvas || !document.body) return;
      var c = document.createElement('canvas');
      c.id = 'tema-chuva'; c.setAttribute('aria-hidden', 'true');
      c.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
      document.body.appendChild(c);
      chuva.canvas = c; chuva.ctx = c.getContext('2d');
      chuvaEstilo(chuva.modo);
      chuvaDimensionar();
      chuva.ligado = true;
      window.addEventListener('resize', chuvaRedimensionou);
      document.addEventListener('visibilitychange', chuvaVisibilidade);
      chuva.raf = requestAnimationFrame(chuvaQuadro);
    }
    if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
  }

  function pararChuva() {
    chuva.querer = false; chuva.ligado = false;
    if (chuva.raf) cancelAnimationFrame(chuva.raf);
    chuva.raf = 0;
    window.removeEventListener('resize', chuvaRedimensionou);
    document.removeEventListener('visibilitychange', chuvaVisibilidade);
    if (chuva.canvas && chuva.canvas.parentNode) chuva.canvas.parentNode.removeChild(chuva.canvas);
    chuva.canvas = null; chuva.ctx = null;
  }

  // ---------- CENÁRIO ANIMADO POR TEMA (só no site público) ----------
  // Uma camada fixa por cima do conteúdo, transparente aos cliques (pointer-events:none),
  // com figuras desenhadas em SVG que passam pela tela: tumbleweeds, carros, shurikens...
  // Não baixa nenhuma imagem externa; não liga se o visitante pediu "reduzir movimento".
  // As animações (keyframes tema-fx-*) ficam em temas-modelos.css.
  var fx = { el: null, modelo: null, querer: null };
  var NS = 'xmlns="http://www.w3.org/2000/svg"';

  function svgUrl(s) { return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(s) + '")'; }
  function I(s, ar) { return { s: s, r: ar }; }   // figura + proporção (largura/altura)

  function estrela(cx, cy, r, cor) {
    var p = [];
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r;
      p.push((cx + rr * Math.cos(ang)).toFixed(1) + ',' + (cy + rr * Math.sin(ang)).toFixed(1));
    }
    return '<polygon points="' + p.join(' ') + '" fill="' + cor + '" stroke="#8f0b10" stroke-width="0.9" stroke-linejoin="round"/>';
  }
  var POS_ESFERA = {
    1: [[50, 50]], 2: [[38, 50], [62, 50]], 3: [[50, 37], [38, 60], [62, 60]],
    4: [[38, 38], [62, 38], [38, 62], [62, 62]],
    5: [[50, 29], [28, 46], [72, 46], [37, 70], [63, 70]],
    6: [[50, 26], [72, 38], [72, 62], [50, 74], [28, 62], [28, 38]],
    7: [[50, 26], [72, 38], [72, 62], [50, 74], [28, 62], [28, 38], [50, 50]]
  };
  var R_ESTRELA = { 1: 22, 2: 14, 3: 12.5, 4: 11, 5: 10, 6: 9, 7: 9 };
  // Esfera do Dragão: âmbar translúcido, brilho, estrelas vermelhas bem visíveis e aura
  function esfera(n) {
    var s = '<svg ' + NS + ' viewBox="0 0 100 100"><defs>' +
      '<radialGradient id="b" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#fff3b0"/><stop offset=".32" stop-color="#ffbf24"/><stop offset=".75" stop-color="#f58a00"/><stop offset="1" stop-color="#d45a00"/></radialGradient>' +
      '<radialGradient id="h"><stop offset="0.6" stop-color="#ffd24a" stop-opacity=".6"/><stop offset="1" stop-color="#ffd24a" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="50" cy="50" r="50" fill="url(#h)"/><circle cx="50" cy="50" r="40" fill="url(#b)"/>';
    POS_ESFERA[n].forEach(function (q) { s += estrela(q[0], q[1], R_ESTRELA[n], '#e3171e'); });
    return I(s + '<ellipse cx="37" cy="31" rx="13" ry="7" transform="rotate(-32 37 31)" fill="#fff" opacity=".75"/><circle cx="66" cy="68" r="3" fill="#fff" opacity=".35"/></svg>', 1);
  }
  function risco(cor) {
    return I('<svg ' + NS + ' viewBox="0 0 300 6"><defs><linearGradient id="g"><stop offset="0" stop-color="' + cor + '" stop-opacity="0"/><stop offset="1" stop-color="' + cor + '"/></linearGradient></defs><rect y="1" width="300" height="4" rx="2" fill="url(#g)"/></svg>', 50);
  }
  function shuriken(cor) {
    return I('<svg ' + NS + ' viewBox="0 0 100 100"><path fill-rule="evenodd" fill="' + cor + '" d="M50 2L61 39L98 50L61 61L50 98L39 61L2 50L39 39Z M50 42a8 8 0 1 0 0.01 0Z"/></svg>', 1);
  }
  function folha(cor) {
    return I('<svg ' + NS + ' viewBox="0 0 100 100"><path d="M50 6Q94 40 50 94Q6 40 50 6Z" fill="' + cor + '"/><path d="M50 18L50 90M50 44L68 34M50 60L32 50" stroke="#fff" stroke-opacity=".55" stroke-width="3" fill="none" stroke-linecap="round"/></svg>', 1);
  }
  function espiral(cor) {
    return I('<svg ' + NS + ' viewBox="0 0 100 100" fill="none" stroke="' + cor + '" stroke-width="5" stroke-linecap="round"><path d="M50 50a4 4 0 0 1 8 0a12 12 0 0 1 -24 0a22 22 0 0 1 44 0a32 32 0 0 1 -64 0a42 42 0 0 1 84 0"/></svg>', 1);
  }
  function pena(cor) {
    return I('<svg ' + NS + ' viewBox="0 0 40 100"><path d="M20 2Q38 36 20 98Q2 36 20 2Z" fill="' + cor + '"/><path d="M20 8L20 96" stroke="#fff" stroke-opacity=".5" stroke-width="1.6"/></svg>', 0.4);
  }
  function confete(cor) {
    return I('<svg ' + NS + ' viewBox="0 0 20 12"><rect width="20" height="12" rx="2" fill="' + cor + '"/></svg>', 1.6);
  }
  // Arara em voo: corpo fino, cabeça com bico curvo, cauda longa e DUAS asas de penas que batem (animação dentro do próprio SVG)
  function arara(cc, cf, ct) {
    var bate = function (v) { return '<animateTransform attributeName="transform" type="rotate" values="' + v + '" dur="0.8s" repeatCount="indefinite"/>'; };
    return I('<svg ' + NS + ' viewBox="0 0 200 130">' +
      '<g>' + bate('8 98 76;-24 98 76;8 98 76') + '<path d="M92 78C70 92 60 110 70 126L78 120L82 128L92 118L98 126L104 112C112 100 116 90 118 80Z" fill="' + ct + '"/></g>' +
      '<path d="M66 82L4 126L10 112L60 78Z" fill="' + ct + '"/><path d="M68 78L12 112L22 100L64 74Z" fill="' + cf + '"/>' +
      '<path d="M60 80C64 60 92 54 116 56C136 58 146 66 142 76C136 88 104 94 74 90Z" fill="' + cc + '"/>' +
      '<ellipse cx="112" cy="80" rx="28" ry="6" fill="#fff" opacity=".18"/>' +
      '<circle cx="146" cy="54" r="17" fill="' + cc + '"/><ellipse cx="152" cy="59" rx="9" ry="8" fill="#d6e8f5"/>' +
      '<path d="M158 44C182 42 184 66 172 72C170 64 164 62 158 60Z" fill="#33333d"/><path d="M160 62C168 64 172 68 168 73C163 72 160 68 159 64Z" fill="#4a4a55"/>' +
      '<circle cx="150" cy="50" r="3.6" fill="#fff"/><circle cx="151" cy="50" r="1.8" fill="#111"/>' +
      '<g>' + bate('-6 104 64;32 104 64;-6 104 64') + '<path d="M100 66C82 44 74 20 94 6L98 14L104 3L110 13L118 4L120 16L130 9L130 26C128 44 122 58 116 66Z" fill="' + cf + '"/><path d="M104 62C92 44 90 28 100 16C108 30 112 46 112 62Z" fill="#fff" opacity=".22"/></g></svg>', 200 / 130);
  }
  // Gaivota com asas que batem (o desenho do SVG muda de forma)
  var GAIVOTA = I('<svg ' + NS + ' viewBox="0 0 80 40"><path fill="#fff" stroke="#9fb3c8" stroke-width="1" d="M2 22Q20 2 40 20Q60 2 78 22Q60 14 40 28Q20 14 2 22Z"><animate attributeName="d" dur="0.9s" repeatCount="indefinite" values="M2 22Q20 2 40 20Q60 2 78 22Q60 14 40 28Q20 14 2 22Z;M2 34Q20 22 40 22Q60 22 78 34Q60 28 40 30Q20 28 2 34Z;M2 22Q20 2 40 20Q60 2 78 22Q60 14 40 28Q20 14 2 22Z"/></path></svg>', 2);
  var FENO = I('<svg ' + NS + ' viewBox="0 0 100 100" fill="none" stroke="#b58a4c" stroke-width="3" stroke-linecap="round"><circle cx="50" cy="50" r="40"/><ellipse cx="50" cy="50" rx="40" ry="16" transform="rotate(30 50 50)"/><ellipse cx="50" cy="50" rx="40" ry="16" transform="rotate(-35 50 50)"/><ellipse cx="50" cy="50" rx="16" ry="40" transform="rotate(12 50 50)"/><path d="M18 32Q50 58 84 30"/><path d="M16 68Q50 42 86 70"/><path d="M30 18Q44 50 28 84"/></svg>', 1);
  var CACTO = I('<svg ' + NS + ' viewBox="0 0 80 140" fill="#6f9448"><rect x="30" y="8" width="20" height="128" rx="10"/><rect x="6" y="46" width="13" height="42" rx="6.5"/><rect x="6" y="76" width="32" height="12" rx="6"/><rect x="61" y="30" width="13" height="40" rx="6.5"/><rect x="42" y="58" width="32" height="12" rx="6"/></svg>', 80 / 140);
  var ABUTRE = I('<svg ' + NS + ' viewBox="0 0 120 50"><path d="M0 30Q30 0 60 28Q90 0 120 30Q90 20 60 44Q30 20 0 30Z" fill="#6b4a2a"/></svg>', 2.4);
  var NUVEM = I('<svg ' + NS + ' viewBox="0 0 160 80"><g fill="#ffd84a"><circle cx="45" cy="50" r="26"/><circle cx="80" cy="38" r="32"/><circle cx="115" cy="50" r="26"/><rect x="30" y="50" width="100" height="26" rx="13"/></g><circle cx="75" cy="28" r="14" fill="#fff3b0" opacity=".6"/></svg>', 2);
  var FAISCA = I('<svg ' + NS + ' viewBox="0 0 20 20"><defs><radialGradient id="g"><stop offset="0" stop-color="#fff7b0"/><stop offset="1" stop-color="#ffb800" stop-opacity="0"/></radialGradient></defs><circle cx="10" cy="10" r="10" fill="url(#g)"/></svg>', 1);
  var RIO_SIL = I('<svg ' + NS + ' viewBox="0 0 600 120" preserveAspectRatio="none"><path d="M0 120L0 92Q60 80 120 94Q170 60 205 40Q232 28 250 44Q268 66 300 78Q360 70 420 90Q500 70 600 88L600 120Z" fill="#1f6fe5"/></svg>', 5);

  function nuvem(c1, c2) {
    return I('<svg ' + NS + ' viewBox="0 0 160 80"><g fill="' + c1 + '"><circle cx="45" cy="50" r="26"/><circle cx="80" cy="38" r="32"/><circle cx="115" cy="50" r="26"/><rect x="30" y="50" width="100" height="26" rx="13"/></g><circle cx="75" cy="28" r="14" fill="' + c2 + '" opacity=".6"/></svg>', 2);
  }
  var NUVEM_B = nuvem('#ffffff', '#e3eef9');
  var ONDA_T = '<svg ' + NS + ' viewBox="0 0 600 60" preserveAspectRatio="none"><path d="M0 30Q75 0 150 30T300 30T450 30T600 30V60H0Z" fill="COR"/></svg>';
  var CHAPEU = I('<svg ' + NS + ' viewBox="0 0 100 70"><ellipse cx="50" cy="48" rx="48" ry="14" fill="#f4c430"/><path d="M24 46Q26 8 50 8Q74 8 76 46Z" fill="#f4c430"/><rect x="25" y="32" width="50" height="9" fill="#d62f3a"/><ellipse cx="50" cy="48" rx="48" ry="14" fill="none" stroke="#c99a12" stroke-width="2"/></svg>', 100 / 70);
  var CAVEIRA = I('<svg ' + NS + ' viewBox="0 0 120 120"><g stroke="#e8e8e8" stroke-width="7" stroke-linecap="round"><line x1="22" y1="88" x2="98" y2="114"/><line x1="98" y1="88" x2="22" y2="114"/></g><path d="M30 62Q30 30 60 30Q90 30 90 62Q90 78 78 82L78 92L42 92L42 82Q30 78 30 62Z" fill="#f2f2f2"/><circle cx="47" cy="62" r="9" fill="#111"/><circle cx="73" cy="62" r="9" fill="#111"/><path d="M60 70L55 80L65 80Z" fill="#111"/><path d="M50 92V84M60 92V84M70 92V84" stroke="#111" stroke-width="2"/><ellipse cx="60" cy="34" rx="42" ry="8" fill="#f4c430"/><path d="M34 34Q36 4 60 4Q84 4 86 34Z" fill="#f4c430"/><rect x="35" y="22" width="50" height="8" fill="#d62f3a"/></svg>', 1);
  var BUSSOLA = I('<svg ' + NS + ' viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="#f4c430" stroke-width="3"/><circle cx="50" cy="50" r="38" fill="none" stroke="#f4c430" stroke-width="1" stroke-dasharray="2 5"/><path d="M50 4L58 42L96 50L58 58L50 96L42 58L4 50L42 42Z" fill="#f4c430" opacity=".85"/><path d="M50 4L58 42L42 42Z" fill="#d62f3a"/><circle cx="50" cy="50" r="5" fill="#d62f3a"/></svg>', 1);
  var NAVIO = I('<svg ' + NS + ' viewBox="0 0 260 220"><path d="M20 150L240 150Q230 192 190 202L60 202Q30 192 20 150Z" fill="#8a5a2b"/><path d="M26 164L236 164M34 178L226 178" stroke="#5c3a1a" stroke-width="2"/><path d="M236 150L258 134" stroke="#5c3a1a" stroke-width="5" stroke-linecap="round"/><rect x="124" y="18" width="6" height="134" fill="#5c3a1a"/><rect x="190" y="50" width="5" height="102" fill="#5c3a1a"/><path d="M70 30Q127 22 184 30Q196 74 184 118Q127 126 70 118Q58 74 70 30Z" fill="#fff7e0" stroke="#c9b88a" stroke-width="2"/><path d="M164 56Q193 52 222 56Q228 80 222 104Q193 108 164 104Q158 80 164 56Z" fill="#fffaf0" stroke="#c9b88a" stroke-width="2"/><g stroke="#222" stroke-width="4" stroke-linecap="round"><line x1="110" y1="92" x2="144" y2="104"/><line x1="144" y1="92" x2="110" y2="104"/></g><circle cx="127" cy="70" r="13" fill="#222"/><circle cx="122" cy="68" r="3.4" fill="#fff"/><circle cx="132" cy="68" r="3.4" fill="#fff"/><ellipse cx="127" cy="58" rx="20" ry="5" fill="#f4c430"/><path d="M113 58Q115 42 127 42Q139 42 141 58Z" fill="#f4c430"/><rect x="114" y="52" width="26" height="5" fill="#d62f3a"/><path d="M130 18L162 27L130 36Z" fill="#d62f3a"/></svg>', 260 / 220);
  var RIO_SIL = I('<svg ' + NS + ' viewBox="0 0 600 120" preserveAspectRatio="none"><path d="M0 120L0 92Q60 80 120 94Q170 60 205 40Q232 28 250 44Q268 66 300 78Q360 70 420 90Q500 70 600 88L600 120Z" fill="#1f6fe5"/></svg>', 5);

  // Cada item: i=figura, w=largura(px ou css), css=posição, a=animação, d=duração(s), de=atraso(s, negativo = já começa no meio),
  // o=opacidade, m:false = esconde no celular, t/fs/c = texto (kanji), bg/h = fundo livre
  var FX = {
    faroeste: function () { return [
      { i: FENO, w: 72, css: 'top:80%;left:0', a: 'rolar', d: 26, de: -5, o: .36 },
      { i: FENO, w: 44, css: 'top:90%;left:0', a: 'rolar', d: 19, de: -13, o: .3 },
      { i: FENO, w: 100, css: 'top:70%;left:0', a: 'rolar', d: 40, de: -24, o: .26, m: false },
      { i: ABUTRE, w: 84, css: 'top:10%;left:0', a: 'cruzar', d: 60, de: -22, o: .26 },
      { i: ABUTRE, w: 54, css: 'top:20%;left:0', a: 'cruzar-rev', d: 80, de: -50, o: .2, m: false },
      { i: CACTO, w: 74, css: 'bottom:0;left:1%', o: .28, m: false },
      { i: CACTO, w: 52, css: 'bottom:0;right:2%', o: .24, m: false }
    ]; },

    // Corrida de Rua: sem carros — só riscos de velocidade (as faixas das bordas e o quadriculado vêm do CSS/menu)
    velozes: function () { return [
      { i: risco('#ff4a1c'), w: 360, css: 'top:14%;left:0', a: 'cruzar', d: 2.6, de: -1, o: .42 },
      { i: risco('#19b5ff'), w: 300, css: 'top:27%;left:0', a: 'cruzar', d: 3.4, de: -2.2, o: .36 },
      { i: risco('#ffffff'), w: 420, css: 'top:41%;left:0', a: 'cruzar', d: 2.9, de: -0.4, o: .24, m: false },
      { i: risco('#ff4a1c'), w: 320, css: 'top:55%;left:0', a: 'cruzar', d: 3.8, de: -3, o: .34 },
      { i: risco('#19b5ff'), w: 380, css: 'top:69%;left:0', a: 'cruzar', d: 2.4, de: -1.6, o: .3, m: false },
      { i: risco('#ffffff'), w: 280, css: 'top:82%;left:0', a: 'cruzar', d: 3.1, de: -2.6, o: .26 },
      { i: risco('#ff4a1c'), w: 440, css: 'top:92%;left:0', a: 'cruzar', d: 2.2, de: -0.8, o: .36, m: false }
    ]; },

    ninja: function () { return [
      { i: shuriken('#9aa6bd'), w: 46, css: 'top:0;left:10%', a: 'cair', d: 13, de: -3, o: .4 },
      { i: shuriken('#ff8a1f'), w: 32, css: 'top:0;left:46%', a: 'cair', d: 17, de: -9, o: .34 },
      { i: shuriken('#9aa6bd'), w: 54, css: 'top:0;left:84%', a: 'cair', d: 15, de: -6, o: .36, m: false },
      { i: folha('#6fbf3c'), w: 30, css: 'top:0;left:24%', a: 'cair', d: 20, de: -5, o: .4 },
      { i: folha('#ff9d3a'), w: 26, css: 'top:0;left:60%', a: 'cair', d: 24, de: -14, o: .4 },
      { i: folha('#6fbf3c'), w: 34, css: 'top:0;left:92%', a: 'cair', d: 22, de: -1, o: .36, m: false },
      { i: folha('#ff9d3a'), w: 24, css: 'top:0;left:72%', a: 'cair', d: 26, de: -18, o: .32 },
      { i: espiral('#ff8a1f'), w: 240, css: 'right:-70px;bottom:-70px', a: 'girar', d: 40, o: .16 },
      { i: espiral('#4db8ff'), w: 170, css: 'left:-60px;top:34%', a: 'girar', d: 56, o: .11, m: false },
      { t: '忍', fs: '130px', c: '#ff8a1f', css: 'top:60%;left:4%', a: 'flutuar', d: 7, o: .11, m: false },
      { t: '火', fs: '110px', c: '#4db8ff', css: 'top:16%;right:3%', a: 'flutuar', d: 9, de: -3, o: .1, m: false }
    ]; },

    dragao: function () {
      var l = [
        { bg: 'radial-gradient(ellipse at 50% 100%, rgba(255,184,0,.38), rgba(255,122,0,.12) 45%, transparent 72%)', w: '100vw', h: '42vh', css: 'bottom:0;left:0', a: 'pulsar', d: 4, o: 1 },
        { i: nuvem('#ffd84a', '#fff3b0'), w: 150, css: 'top:30%;left:0', a: 'cruzar', d: 38, de: -8, o: .34 },
        { i: esfera(4), w: 66, css: 'top:0;left:6%', a: 'subir', d: 30, de: -6, o: .78 },
        { i: esfera(1), w: 58, css: 'top:0;left:36%', a: 'subir', d: 36, de: -22, o: .74 },
        { i: esfera(7), w: 70, css: 'top:0;left:66%', a: 'subir', d: 33, de: -12, o: .78, m: false },
        { i: esfera(2), w: 54, css: 'top:0;left:90%', a: 'subir', d: 39, de: -28, o: .72, m: false }
      ];
      var lefts = [5, 17, 29, 41, 53, 65, 77, 89];
      for (var k = 0; k < lefts.length; k++)
        l.push({ i: FAISCA, w: 18 + (k % 3) * 8, css: 'top:0;left:' + lefts[k] + '%', a: 'subir', d: 8 + (k % 4) * 2.5, de: -k * 1.7, o: .7, m: k < 5 });
      return l;
    },

    rio: function () {
      var l = [
        { bg: svgUrl(RIO_SIL.s) + ' bottom/100% 100% no-repeat', w: '100vw', h: '16vh', css: 'bottom:0;left:0', o: .16 },
        { i: arara('#2b86ff', '#1f6fe5', '#0f4fb8'), w: 150, css: 'top:16%;left:0', a: 'onda', d: 26, de: -6, o: .8 },
        { i: arara('#ff4d4d', '#ffc400', '#1f6fe5'), w: 104, css: 'top:42%;left:0', a: 'onda', d: 34, de: -22, o: .7, m: false }
      ];
      var cores = ['#2b86ff', '#ffc400', '#ff3d8b', '#1fd6a3', '#2b86ff', '#ff3d8b'];
      for (var k = 0; k < cores.length; k++)
        l.push({ i: pena(cores[k]), w: 24 + (k % 3) * 6, css: 'top:0;left:' + (8 + k * 16) + '%', a: 'cair', d: 17 + k * 2.5, de: -k * 3.1, o: .5, m: k < 4 });
      var cc = ['#ffc400', '#ff3d8b', '#1fd6a3', '#2b86ff', '#ffffff', '#ff3d8b', '#ffc400', '#1fd6a3'];
      for (var j = 0; j < cc.length; j++)
        l.push({ i: confete(cc[j]), w: 12 + (j % 3) * 3, css: 'top:0;left:' + (4 + j * 12) + '%', a: 'cair', d: 10 + (j % 4) * 3, de: -j * 2.3, o: .65, m: j < 5 });
      return l;
    },

    // Mar dos Piratas (estilo One Piece): ondas, navio, gaivotas, nuvens, chapéu de palha, caveira e bússola
    pirata: function () { return [
      { i: BUSSOLA, w: 200, css: 'right:-60px;top:28%', a: 'girar', d: 120, o: .12, m: false },
      { i: CAVEIRA, w: 120, css: 'bottom:15vh;left:2%', a: 'flutuar', d: 8, o: .16, m: false },
      { i: NUVEM_B, w: 170, css: 'top:9%;left:0', a: 'cruzar', d: 90, de: -30, o: .22 },
      { i: NUVEM_B, w: 110, css: 'top:22%;left:0', a: 'cruzar', d: 120, de: -80, o: .16, m: false },
      { i: GAIVOTA, w: 62, css: 'top:13%;left:0', a: 'cruzar', d: 32, de: -9, o: .6 },
      { i: GAIVOTA, w: 44, css: 'top:19%;left:0', a: 'cruzar', d: 40, de: -24, o: .5 },
      { i: GAIVOTA, w: 52, css: 'top:30%;left:0', a: 'cruzar-rev', d: 46, de: -30, o: .45, m: false },
      { i: CHAPEU, w: 78, css: 'top:34%;right:3%', a: 'flutuar', d: 6, o: .34, m: false },
      { bg: svgUrl(ONDA_T.replace('COR', '#4fb6e8')) + ' 0 100% / 600px 100% repeat-x', w: '100vw', h: '11vh', css: 'bottom:0;left:0', a: 'ondas', d: 18, o: .3 },
      { i: NAVIO, w: 210, css: 'bottom:3vh;left:0', a: 'navegar', d: 70, de: -18, o: .6 },
      { bg: svgUrl(ONDA_T.replace('COR', '#1e7fc0')) + ' 0 100% / 600px 100% repeat-x', w: '100vw', h: '7vh', css: 'bottom:0;left:0', a: 'ondas', d: 10, o: .42 }
    ]; }
  };

  function removerFx() {
    if (fx.el && fx.el.parentNode) fx.el.parentNode.removeChild(fx.el);
    fx.el = null; fx.modelo = null;
  }
  function pararFx() { fx.querer = null; removerFx(); }

  function montarFx(modelo, modo) {
    var c = document.createElement('div');
    c.id = 'tema-fx'; c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:9000;pointer-events:none;overflow:hidden;opacity:' + (modo === 'dia' ? '.85' : '1') + ';';
    FX[modelo]().forEach(function (sp) {
      var e = document.createElement('div');
      var w = typeof sp.w === 'number' ? sp.w + 'px' : (sp.w || 'auto');
      var st = 'position:absolute;opacity:' + sp.o + ';' + (sp.css ? sp.css + ';' : '');
      if (sp.t) {
        e.textContent = sp.t;
        st += 'font-size:calc(' + sp.fs + ' * var(--fx-k,1));color:' + sp.c + ';font-weight:800;line-height:1;white-space:nowrap;font-family:"Noto Sans JP","Yu Gothic","Hiragino Sans","Meiryo",sans-serif;';
      } else if (sp.bg) {
        st += 'width:' + w + ';height:' + sp.h + ';background:' + sp.bg + ';';
      } else {
        st += 'width:calc(' + w + ' * var(--fx-k,1));aspect-ratio:' + sp.i.r + ';background:' + svgUrl(sp.i.s) + ' center/contain no-repeat;';
      }
      if (sp.a) st += 'animation:tema-fx-' + sp.a + ' ' + sp.d + 's linear ' + (sp.de || 0) + 's infinite;will-change:transform;';
      e.style.cssText = st;
      if (sp.m === false) e.setAttribute('data-fx-m', '0');
      c.appendChild(e);
    });
    return c;
  }

  function iniciarFx(modelo, modo) {
    fx.querer = modelo;
    if (fx.el && fx.modelo === modelo) { fx.el.style.opacity = (modo === 'dia' ? '.85' : '1'); return; }
    removerFx();
    if (reduzMovimento()) return;
    function montar() {
      if (fx.querer !== modelo || fx.el || !document.body) return;
      fx.el = montarFx(modelo, modo); fx.modelo = modelo;
      document.body.appendChild(fx.el);
    }
    if (document.body) montar(); else document.addEventListener('DOMContentLoaded', montar);
  }

  // ---------- SHENLONG ENROLADO NO MENU (tema Esferas do Dragão) ----------
  // O dragão é desenhado por código na largura real do menu, em DUAS camadas:
  // uma ATRÁS dos links (z-index -1) e outra NA FRENTE, transparente. Os trechos
  // alternam entre as camadas, então ele parece passar por dentro do menu sem
  // esconder os botões (que continuam clicáveis: pointer-events:none).
  var dragao = { querer: false, timer: 0, ro: null, nav: null, estilo: null, ligado: false };
  var CABECA =
    '<path d="M96 38Q70 72 24 70" stroke="#fff" stroke-width="2.2" fill="none" opacity=".9"/>' +
    '<path d="M102 32Q90 68 58 80" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>' +
    '<path d="M30 14Q20 -10 42 -18Q36 -2 46 12Z" fill="#f0d98a" stroke="#a07c1c" stroke-width="1.5"/>' +
    '<path d="M14 22Q0 4 10 -10Q16 4 26 18Z" fill="#f0d98a" stroke="#a07c1c" stroke-width="1.5"/>' +
    '<path d="M4 36Q8 12 40 10Q74 8 102 24Q114 32 108 40Q98 52 70 52Q36 58 14 50Q2 46 4 36Z" fill="#3dbb52" stroke="#0e5326" stroke-width="2"/>' +
    '<path d="M22 47Q70 58 106 41Q98 53 70 55Q42 59 22 47Z" fill="#eef5b4" stroke="#0e5326" stroke-width="1.2"/>' +
    '<path d="M108 40Q84 47 50 44" stroke="#0e5326" stroke-width="2" fill="none"/>' +
    '<path d="M97 43l3 6l3-7zM83 45l3 6l3-6z" fill="#fff"/>' +
    '<ellipse cx="62" cy="26" rx="7" ry="4.5" fill="#ff2a2a"/><circle cx="64" cy="26" r="2" fill="#111"/>' +
    '<path d="M52 20Q64 13 77 22" stroke="#0e5326" stroke-width="2.4" fill="none"/>' +
    '<circle cx="101" cy="30" r="2" fill="#0e5326"/>';

  function dragaoLimpar() {
    var xs = document.querySelectorAll('.dragao-enrolado');
    for (var i = 0; i < xs.length; i++) if (xs[i].parentNode) xs[i].parentNode.removeChild(xs[i]);
    if (dragao.nav && dragao.estilo) {
      if (dragao.estilo.pos) dragao.nav.style.position = '';
      if (dragao.estilo.z) dragao.nav.style.zIndex = '';
    }
    dragao.estilo = null;
  }

  function dragaoCamada(W, Ht, OV, cls, z, op, conteudo) {
    var d = document.createElement('div');
    d.className = 'dragao-enrolado ' + cls;
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:absolute;left:0;top:' + (-OV) + 'px;width:' + W + 'px;height:' + Ht + 'px;pointer-events:none;z-index:' + z + ';opacity:' + op + ';';
    d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + Ht + '" viewBox="0 0 ' + W + ' ' + Ht + '">' + conteudo + '</svg>';
    return d;
  }

  function dragaoMontar() {
    if (!dragao.querer || !document.body) return;
    var nav = document.querySelector('.site-nav');
    if (!nav || document.body.classList.contains('layout-lateral')) return;
    var r = nav.getBoundingClientRect(), W = Math.round(r.width), H = Math.round(r.height);
    dragaoLimpar();
    dragao.nav = nav;
    if (W < 760 || H < 30) return;               // celular: o menu vira botão, sem dragão

    var cs = getComputedStyle(nav);
    dragao.estilo = { pos: false, z: false };
    if (cs.position === 'static') { nav.style.position = 'relative'; dragao.estilo.pos = true; }
    if (cs.zIndex === 'auto') { nav.style.zIndex = '50'; dragao.estilo.z = true; }

    var OV = 50, Ht = H + OV * 2, cy = OV + H / 2;
    var A = H * 0.5 + 14;                          // a onda passa um pouco da borda do menu
    var P = Math.max(220, Math.min(320, W / 4.4)); // comprimento de cada volta
    var xCab = W - 170, x0 = -30, passo = 4.5, yCab = OV - 24;
    var n = Math.ceil((xCab - x0) / passo), L = { f: ['', '', ''], t: ['', '', ''] };
    for (var k = 0; k <= n; k++) {
      var x = x0 + k * passo, t = (x - x0) / (xCab - x0);
      var fim = Math.max(0, (t - 0.76) / 0.24), fim2 = fim * fim;       // perto da cabeça a onda acalma e sobe
      var fase = 2 * Math.PI * (x - x0) / P;
      var y = cy + A * (1 - fim2) * Math.sin(fase) + (yCab - cy) * fim2;
      var rr = 5 + 10 * Math.pow(t, 0.7);                                 // cauda fina → corpo grosso
      var c = L[Math.floor(fase / Math.PI) % 2 === 0 ? 'f' : 't'], xs = x.toFixed(1), ys = y.toFixed(1);
      c[0] += '<circle cx="' + xs + '" cy="' + ys + '" r="' + (rr + 1.7).toFixed(1) + '" fill="#0e5326"/>';      // contorno contínuo
      c[1] += '<circle cx="' + xs + '" cy="' + ys + '" r="' + rr.toFixed(1) + '" fill="#3dbb52"/>';              // corpo
      c[2] += '<circle cx="' + xs + '" cy="' + (y + rr * 0.45).toFixed(1) + '" r="' + (rr * 0.5).toFixed(1) + '" fill="#bfe38a"/>';   // barriga
    }
    var frente = L.f.join(''), tras = L.t.join('');
    var cabeca = '<g transform="translate(' + xCab.toFixed(1) + ',' + yCab.toFixed(1) + ') rotate(-8) scale(.9) translate(-6,-34)">' + CABECA + '</g>';
    nav.appendChild(dragaoCamada(W, Ht, OV, 'tras', -1, 0.9, tras));
    nav.appendChild(dragaoCamada(W, Ht, OV, 'frente', 6, 0.32, frente + cabeca));
  }

  function dragaoAgendar() {
    clearTimeout(dragao.timer);
    dragao.timer = setTimeout(dragaoMontar, 140);
  }

  function iniciarDragao() {
    dragao.querer = true;
    if (dragao.ligado) { dragaoAgendar(); return; }
    dragao.ligado = true;
    window.addEventListener('resize', dragaoAgendar);
    window.addEventListener('load', dragaoAgendar);
    document.addEventListener('DOMContentLoaded', function () {
      dragaoAgendar();
      var nav = document.querySelector('.site-nav');
      if (nav && window.ResizeObserver) {
        dragao.ro = new ResizeObserver(function () { dragaoAgendar(); });
        dragao.ro.observe(nav);
      }
    });
    if (document.body) dragaoAgendar();
  }

  function pararDragao() {
    dragao.querer = false; clearTimeout(dragao.timer);
    if (dragao.ro) { dragao.ro.disconnect(); dragao.ro = null; }
    if (dragao.ligado) {
      window.removeEventListener('resize', dragaoAgendar);
      window.removeEventListener('load', dragaoAgendar);
      dragao.ligado = false;
    }
    dragaoLimpar();
  }

  // ---------- JUTSU AO TROCAR DE PÁGINA (tema Ninja da Folha) ----------
  // Ao clicar num link do próprio site: nuvem de fumaça sai do ponto do clique, folhas
  // giram em espiral, anel de chakra se abre e o kanji 術 (técnica) aparece. A página
  // seguinte já abre dentro da fumaça e ela se dissipa. Se o aparelho pede "reduzir
  // movimento", nada disso acontece e o link funciona normalmente.
  var jutsu = { ligado: false, ocupado: false, entrou: false };

  function jutsuAtivo() {
    return escopo === 'site' && document.documentElement.getAttribute('data-modelo') === 'ninja' && !reduzMovimento();
  }

  function jutsuMontar(x, y, modo) {
    var o = document.createElement('div');
    o.id = 'tema-jutsu'; o.className = 'jutsu-' + modo; o.setAttribute('aria-hidden', 'true');
    o.style.cssText = '--jx:' + Math.round(x) + 'px;--jy:' + Math.round(y) + 'px;';
    var h = '<div class="j-flash"></div>', i;
    for (i = 0; i < 9; i++) {
      var ang = i * 40 * Math.PI / 180, d = 6 + (i % 3) * 10;
      h += '<i class="j-nuvem" style="--dx:' + Math.round(Math.cos(ang) * d) + 'vmax;--dy:' + Math.round(Math.sin(ang) * d) + 'vmax;--de:' + (i * 35) + 'ms;--s:' + (0.8 + (i % 4) * 0.35).toFixed(2) + '"></i>';
    }
    for (i = 0; i < 14; i++)
      h += '<b class="j-folha" style="--a:' + (i * 26) + 'deg;--r:' + (14 + (i % 5) * 9) + 'vmax;--de:' + (i * 28) + 'ms;--c:' + (i % 2 ? '#6fbf3c' : '#ff9d3a') + '"></b>';
    o.innerHTML = h + '<span class="j-anel"></span><span class="j-kanji">術</span>';
    document.body.appendChild(o);
    return o;
  }

  function jutsuClique(e) {
    if (jutsu.ocupado || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!jutsuAtivo()) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(javascript:|mailto:|tel:)/i.test(href)) return;
    var url; try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    if (/^\/api\//.test(url.pathname) || /\.(pdf|zip|png|jpe?g|webp|gif|mp4)$/i.test(url.pathname)) return;
    e.preventDefault();
    jutsu.ocupado = true;
    var x = e.clientX, y = e.clientY;
    if (!x && !y) { var rc = a.getBoundingClientRect(); x = rc.left + rc.width / 2; y = rc.top + rc.height / 2; }   // clique por teclado
    jutsuMontar(x, y, 'sair');
    try { sessionStorage.setItem('tema_jutsu', JSON.stringify({ t: Date.now(), x: x, y: y })); } catch (err) {}
    setTimeout(function () { location.href = url.href; }, 620);
    setTimeout(function () {                      // rede de segurança: se a navegação não acontecer, destrava a página
      jutsu.ocupado = false;
      var o = document.getElementById('tema-jutsu'); if (o && o.parentNode) o.parentNode.removeChild(o);
    }, 3000);
  }
  function jutsuVoltou(e) {
    if (!e.persisted) return;
    jutsu.ocupado = false;
    var o = document.getElementById('tema-jutsu'); if (o && o.parentNode) o.parentNode.removeChild(o);
  }

  function iniciarJutsu() {
    if (!jutsu.ligado) {
      jutsu.ligado = true;
      document.addEventListener('click', jutsuClique, true);
      window.addEventListener('pageshow', jutsuVoltou);
    }
    if (jutsu.entrou) return;
    jutsu.entrou = true;
    if (reduzMovimento()) return;
    var d = null;
    try { d = JSON.parse(sessionStorage.getItem('tema_jutsu') || 'null'); sessionStorage.removeItem('tema_jutsu'); } catch (err) {}
    if (!d || Date.now() - d.t > 5000) return;
    document.documentElement.classList.add('tema-jutsu-cobre');    // cobre a tela desde o 1º quadro (sem "piscar")
    function mostrar() {
      var o = jutsuMontar(d.x, d.y, 'entrar');
      document.documentElement.classList.remove('tema-jutsu-cobre');
      setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 1000);
    }
    if (document.body) mostrar(); else document.addEventListener('DOMContentLoaded', mostrar);
  }
  function pararJutsu() {
    if (jutsu.ligado) {
      document.removeEventListener('click', jutsuClique, true);
      window.removeEventListener('pageshow', jutsuVoltou);
      jutsu.ligado = false;
    }
  }

  function atualizarEfeitos(modelo, modo) {
    if (escopo === 'site' && modelo === 'matrix') iniciarChuva(modo); else pararChuva();
    if (escopo === 'site' && FX[modelo]) iniciarFx(modelo, modo); else pararFx();
    if (escopo === 'site' && modelo === 'dragao') iniciarDragao(); else pararDragao();
    if (escopo === 'site' && modelo === 'ninja') iniciarJutsu(); else pararJutsu();
  }

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
