/* ============================================================
   MODELOS DE IMPRESSÃO — crachás e árvores genealógicas temáticos
   ------------------------------------------------------------
   Um módulo só, usado pelo admin (crachas.html e arvore.html):
     • 11 modelos: Ouro Luxo, Moderno Claro, Moderno Escuro, Elegante e um para
       cada tema do site (Velho Oeste, Código Verde, Corrida de Rua, Ninja,
       Dragão, Rio e Piratas).
     • Tudo é desenhado em HTML/CSS com medidas em MILÍMETROS: o crachá tem
       exatamente 193 x 65 mm e a árvore (folha A4) 277 x 190 mm — sem esticar.
     • Exportação em ALTA RESOLUÇÃO (350 dpi por padrão): PDF e PNG nítidos.
     • Só usa recursos de CSS que o html2canvas desenha com fidelidade
       (nada de texto com degradê nem gradiente cônico).
   API:  ModelosImpressao.lista() · .htmlCracha(dados, modelo, opcoes)
         .htmlArvore(dados, getNo, modelo, opcoes) · .montar(el, html) · .pdf(...) · .png(...)
   ============================================================ */
(function (root) {
  'use strict';

  var TILE = { w: 193, h: 65 };        // crachá / verso (mm)
  var FOLHA = { w: 277, h: 190 };      // árvore em A4 paisagem (mm)

  var esc = function (v) {
    return (v === null || v === undefined) ? '' : String(v).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  };
  var vazio = function (s) { s = String(s == null ? '' : s).trim(); return s === '' || s === '-' || s === '—'; };

  /* ---------- os modelos (paletas + fontes + enfeites) ---------- */
  var MODELOS = {
    ouro: {
      nome: 'Ouro Luxo', emoji: '👑', fontes: 'family=Cinzel:wght@700;900&family=Oswald:wght@500;700',
      ft: "'Cinzel', serif", fx: "'Oswald', sans-serif",
      v: { bg: 'radial-gradient(ellipse at 18% 0%, #4a3508 0, #120d03 55%, #070500 100%)', borda: '#d4a017', 'borda-w': '.8u', titulo: '#f7d56a',
        'titulo-sombra': '0 .3u 0 #7a5200, 0 0 2.2u rgba(255,196,60,.55)', txt: '#f5e6b8', 'cx-bg': 'linear-gradient(180deg,#fff1b3,#e5b73c 55%,#b98a12)',
        'cx-txt': '#2b1d00', 'cx-borda': '#7a5600', 'cx-raio': '3u', 'cx-peso': '700', 'cx-sombra': '0 .3u .6u rgba(0,0,0,.5)', acento: '#e8b93a', linha: '#d4a017',
        macho: 'linear-gradient(180deg,#fff1b3,#e5b73c 55%,#b98a12)', femea: 'linear-gradient(180deg,#ffe9c7,#e0a56a 55%,#b9742a)',
        'logo-bg': '#0d0a02', 'logo-sombra': '0 0 3u rgba(255,200,60,.55)', caps: 'uppercase', ls: '.15u', raio: '2.4u' }
    },
    'moderno-claro': {
      nome: 'Moderno Claro', emoji: '🤍', fontes: 'family=Poppins:wght@600;700;800&family=Inter:wght@500;600;700',
      ft: "'Poppins', sans-serif", fx: "'Inter', sans-serif",
      v: { bg: '#ffffff', borda: '#dfe5ee', 'borda-w': '.5u', titulo: '#0f172a', 'titulo-sombra': 'none', txt: '#0f172a', 'cx-bg': '#f2f6fb', 'cx-txt': '#0f172a',
        'cx-borda': '#d8e0ec', 'cx-raio': '1.8u', 'cx-peso': '600', 'cx-sombra': 'none', acento: '#0ea5a4', linha: '#94a3b8', macho: '#e0f0ff', femea: '#fde4ef',
        'logo-bg': '#ffffff', 'logo-sombra': '0 .5u 1.5u rgba(15,23,42,.18)', caps: 'none', ls: '0', raio: '2.4u' }
    },
    'moderno-escuro': {
      nome: 'Moderno Escuro', emoji: '🖤', fontes: 'family=Space+Grotesk:wght@500;700&family=Inter:wght@500;600;700',
      ft: "'Space Grotesk', sans-serif", fx: "'Inter', sans-serif",
      v: { bg: 'linear-gradient(135deg,#141922,#0b0e14)', borda: '#2a3242', 'borda-w': '.5u', titulo: '#f5f7fa', 'titulo-sombra': 'none', txt: '#e8edf5', 'cx-bg': '#1b2230',
        'cx-txt': '#e8edf5', 'cx-borda': '#2d3749', 'cx-raio': '1.6u', 'cx-peso': '600', 'cx-sombra': 'none', acento: '#c6ff3d', linha: '#4a566b', macho: '#13314d', femea: '#4a1c38',
        'logo-bg': '#0b0e14', 'logo-sombra': '0 0 2.5u rgba(198,255,61,.35)', caps: 'uppercase', ls: '.2u', raio: '2.4u' }
    },
    elegante: {
      nome: 'Elegante', emoji: '🪶', fontes: 'family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Lora:wght@500;600;700',
      ft: "'Playfair Display', serif", fx: "'Lora', serif",
      v: { bg: 'radial-gradient(ellipse at 50% 0%, #fffaf0 0, #f3e8cf 100%)', borda: '#7a1f2b', 'borda-w': '.9u', titulo: '#7a1f2b', 'titulo-sombra': '0 .2u 0 rgba(255,255,255,.8)',
        txt: '#3a2a1a', 'cx-bg': '#fffaf0', 'cx-txt': '#3a2a1a', 'cx-borda': '#c9a96a', 'cx-raio': '1u', 'cx-peso': '600', 'cx-sombra': 'none', acento: '#7a1f2b', linha: '#9c7a3c',
        macho: '#e6edf7', femea: '#f7e4e8', 'logo-bg': '#fffaf0', 'logo-sombra': '0 .4u 1.2u rgba(122,31,43,.3)', caps: 'none', ls: '0', raio: '2.4u' }
    },
    faroeste: {
      nome: 'Velho Oeste', emoji: '🤠', fontes: 'family=Rye&family=Roboto+Slab:wght@600;700',
      ft: "'Rye', serif", fx: "'Roboto Slab', serif",
      v: { bg: 'radial-gradient(ellipse at 50% 40%, #f0dfb4 0, #dcc48a 70%, #c9ac6c 100%)', borda: '#5a3418', 'borda-w': '1.1u', titulo: '#3b200c', 'titulo-sombra': '0 .25u 0 #f6e7c4',
        txt: '#2e1d0e', 'cx-bg': '#f8ecc9', 'cx-txt': '#2e1d0e', 'cx-borda': '#5a3418', 'cx-raio': '.8u', 'cx-peso': '700', 'cx-sombra': '.3u .3u 0 rgba(58,32,12,.35)', acento: '#8a4b1c',
        linha: '#5a3418', macho: '#f8ecc9', femea: '#f6dcc0', 'logo-bg': '#f8ecc9', 'logo-sombra': '.4u .4u 0 rgba(58,32,12,.4)', caps: 'uppercase', ls: '.12u', raio: '1.2u' }
    },
    matrix: {
      nome: 'Código Verde', emoji: '🟢', fontes: 'family=Share+Tech+Mono&family=IBM+Plex+Mono:wght@500;700',
      ft: "'Share Tech Mono', monospace", fx: "'IBM Plex Mono', monospace",
      v: { bg: 'linear-gradient(180deg,#031208,#010603)', borda: '#00e05a', 'borda-w': '.5u', titulo: '#32ff84', 'titulo-sombra': '0 0 1.8u rgba(0,255,102,.75)', txt: '#b7ffcf',
        'cx-bg': '#04200f', 'cx-txt': '#b7ffcf', 'cx-borda': '#00a844', 'cx-raio': '.6u', 'cx-peso': '700', 'cx-sombra': '0 0 1u rgba(0,255,102,.25)', acento: '#00ff66', linha: '#00a844',
        macho: '#04202f', femea: '#2a1030', 'logo-bg': '#020a05', 'logo-sombra': '0 0 3u rgba(0,255,102,.5)', caps: 'uppercase', ls: '.25u', raio: '1.2u' }
    },
    velozes: {
      nome: 'Corrida de Rua', emoji: '🏎️', fontes: 'family=Racing+Sans+One&family=Barlow:wght@600;700;800',
      ft: "'Racing Sans One', sans-serif", fx: "'Barlow', sans-serif",
      v: { bg: 'linear-gradient(135deg,#1c1c28,#09090e)', borda: '#ff4a1c', 'borda-w': '.8u', titulo: '#ff7a3c', 'titulo-sombra': '.35u .35u 0 #19b5ff', txt: '#f4f4f8',
        'cx-bg': '#222233', 'cx-txt': '#f4f4f8', 'cx-borda': '#ff4a1c', 'cx-raio': '.6u 2.4u', 'cx-peso': '700', 'cx-sombra': 'none', acento: '#ff4a1c', linha: '#19b5ff',
        macho: '#10304a', femea: '#4a1a2e', 'logo-bg': '#0b0b11', 'logo-sombra': '0 0 3u rgba(255,74,28,.55)', caps: 'uppercase', ls: '.1u', raio: '1.6u' }
    },
    ninja: {
      nome: 'Ninja da Folha', emoji: '🍥', fontes: 'family=Dela+Gothic+One&family=M+PLUS+Rounded+1c:wght@700;800',
      ft: "'Dela Gothic One', sans-serif", fx: "'M PLUS Rounded 1c', sans-serif",
      v: { bg: 'linear-gradient(160deg,#18214a,#0b0f26)', borda: '#ff8a1f', 'borda-w': '.9u', titulo: '#ffb35c', 'titulo-sombra': '.3u .3u 0 #000', txt: '#f5f1e8',
        'cx-bg': '#202b5c', 'cx-txt': '#ffffff', 'cx-borda': '#ff8a1f', 'cx-raio': '1.8u', 'cx-peso': '800', 'cx-sombra': '0 .35u 0 rgba(0,0,0,.45)', acento: '#ff8a1f', linha: '#ff8a1f',
        macho: '#1d3a78', femea: '#5a2a5e', 'logo-bg': '#0b0f26', 'logo-sombra': '0 0 3u rgba(255,138,31,.5)', caps: 'uppercase', ls: '.1u', raio: '2u' }
    },
    dragao: {
      nome: 'Esferas do Dragão', emoji: '🐉', fontes: 'family=Bangers&family=Rubik:wght@500;700',
      ft: "'Bangers', cursive", fx: "'Rubik', sans-serif",
      v: { bg: 'linear-gradient(180deg,#0f2f8f,#06123a)', borda: '#ffb800', 'borda-w': '1u', titulo: '#ffe27a', 'titulo-sombra': '.4u .4u 0 #c24a00, .8u .8u 0 rgba(0,0,0,.35)', txt: '#fff8e0',
        'cx-bg': '#1d3f9a', 'cx-txt': '#fff8e0', 'cx-borda': '#ffb800', 'cx-raio': '2.2u', 'cx-peso': '700', 'cx-sombra': '.35u .35u 0 rgba(0,0,0,.4)', acento: '#ffb800', linha: '#ffb800',
        macho: '#1d4aa8', femea: '#8a2a6a', 'logo-bg': '#0a1c5c', 'logo-sombra': '0 0 3u rgba(255,184,0,.6)', caps: 'uppercase', ls: '.2u', raio: '2.6u' }
    },
    rio: {
      nome: 'Rio das Araras', emoji: '🦜', fontes: 'family=Lilita+One&family=Baloo+2:wght@600;700;800',
      ft: "'Lilita One', sans-serif", fx: "'Baloo 2', sans-serif",
      v: { bg: 'linear-gradient(135deg,#1f7bf2,#06365e)', borda: '#ffc400', 'borda-w': '1u', titulo: '#ffe36b', 'titulo-sombra': '0 .4u 0 rgba(0,0,0,.35)', txt: '#ffffff',
        'cx-bg': '#fff7d6', 'cx-txt': '#0b2a4a', 'cx-borda': '#ffc400', 'cx-raio': '3.6u', 'cx-peso': '700', 'cx-sombra': '0 .35u 0 rgba(0,0,0,.25)', acento: '#ff3d8b', linha: '#ffc400',
        macho: '#dff0ff', femea: '#ffe0ee', 'logo-bg': '#ffffff', 'logo-sombra': '0 .5u 0 rgba(0,0,0,.25)', caps: 'none', ls: '.05u', raio: '4u' }
    },
    pirata: {
      nome: 'Mar dos Piratas', emoji: '🏴‍☠️', fontes: 'family=Pirata+One&family=Nunito:wght@700;800',
      ft: "'Pirata One', cursive", fx: "'Nunito', sans-serif",
      v: { bg: 'linear-gradient(180deg,#0e2c52,#06172e)', borda: '#f4c430', 'borda-w': '1u', titulo: '#f4c430', 'titulo-sombra': '.3u .3u 0 rgba(0,0,0,.6)', txt: '#fdf6e3',
        'cx-bg': '#fdf0cf', 'cx-txt': '#1a2a44', 'cx-borda': '#d62f3a', 'cx-raio': '1.2u', 'cx-peso': '800', 'cx-sombra': '.3u .3u 0 rgba(0,0,0,.35)', acento: '#d62f3a', linha: '#f4c430',
        macho: '#e3efff', femea: '#fde2e2', 'logo-bg': '#fdf0cf', 'logo-sombra': '.4u .4u 0 rgba(0,0,0,.4)', caps: 'uppercase', ls: '.15u', raio: '2u' }
    }
  };

  /* ---------- CSS (as medidas "Nu" viram calc(var(--u) * N): 1u = 1 mm) ---------- */
  var CSS_BASE = [
    '.mi-root{position:relative;overflow:hidden;box-sizing:border-box;font-family:var(--mi-fx);color:var(--mi-txt);background:var(--mi-bg);line-height:1.1;}',
    '.mi-root *{box-sizing:border-box;margin:0;padding:0;}',
    '.mi-frame{position:absolute;left:0;top:0;right:0;bottom:0;border:var(--mi-borda-w) solid var(--mi-borda);border-radius:var(--mi-raio);pointer-events:none;z-index:3;}',
    '.mi-deco{position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:0;}',
    '.mi-deco i{position:absolute;display:block;}',
    '.mi-t{display:inline-block;white-space:nowrap;}',
    /* crachá */
    '.mi-cracha{padding:2.4u 2.6u;}',
    '.mi-cracha .mi-corpo{position:relative;z-index:1;height:100%;display:flex;gap:2.4u;}',
    '.mi-logo-col{width:49u;flex:none;display:flex;align-items:center;justify-content:center;}',
    '.mi-logo{width:46u;height:46u;border-radius:50%;background:var(--mi-logo-bg);border:1u solid var(--mi-acento);box-shadow:var(--mi-logo-sombra);display:flex;align-items:center;justify-content:center;overflow:hidden;}',
    '.mi-logo img{width:100%;height:100%;object-fit:contain;display:block;}',
    '.mi-logo .mi-mono{font-family:var(--mi-ft);font-size:15u;color:var(--mi-titulo);text-shadow:var(--mi-titulo-sombra);}',
    '.mi-dados{flex:1;min-width:0;display:flex;flex-direction:column;gap:1.2u;}',
    '.mi-nome{height:13u;display:flex;align-items:center;justify-content:center;font-family:var(--mi-ft);color:var(--mi-titulo);text-shadow:var(--mi-titulo-sombra);text-transform:var(--mi-caps);letter-spacing:var(--mi-ls);font-size:9.4u;line-height:1;overflow:hidden;}',
    '.mi-lin{display:flex;gap:1.2u;}',
    '.mi-cx{flex:1;min-width:0;height:7.6u;display:flex;align-items:center;justify-content:center;background:var(--mi-cx-bg);color:var(--mi-cx-txt);border:.4u solid var(--mi-cx-borda);border-radius:var(--mi-cx-raio);font-weight:var(--mi-cx-peso);font-size:3.7u;padding:0 1.6u;overflow:hidden;text-align:center;box-shadow:var(--mi-cx-sombra);}',
    '.mi-lin.mi-rod .mi-cx{height:6.8u;font-size:3.2u;}',
    
    /* árvore */
    '.mi-arv{padding:2u 3u 2.4u;}',
    '.mi-cab{position:relative;z-index:1;height:8.4u;display:flex;align-items:center;justify-content:center;gap:3u;font-family:var(--mi-ft);font-size:6.2u;color:var(--mi-titulo);text-shadow:var(--mi-titulo-sombra);text-transform:var(--mi-caps);letter-spacing:var(--mi-ls);}',
    '.mi-cab .mi-est{color:var(--mi-acento);font-size:4.6u;}',
    '.mi-arvcorpo{position:relative;z-index:1;height:52u;display:flex;align-items:center;}',
    '.mi-ave{position:absolute;left:1.5u;top:-.5u;width:21u;color:var(--mi-acento);opacity:.9;}',
    '.mi-ave svg{width:100%;height:auto;display:block;}',
    '.mi-no{position:relative;display:flex;align-items:center;}',
    '.mi-fl{position:relative;display:flex;flex-direction:column;margin-left:4u;}',
    '.mi-fl:before{content:"";position:absolute;left:-2u;top:25%;bottom:25%;border-left:.45u solid var(--mi-linha);}',
    '.mi-fl>.mi-no:before{content:"";position:absolute;left:-2u;top:50%;width:2u;border-top:.45u solid var(--mi-linha);}',
    '.mi-bx{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--mi-cx-bg);color:var(--mi-cx-txt);border:.35u solid var(--mi-cx-borda);border-radius:var(--mi-cx-raio);font-weight:var(--mi-cx-peso);text-align:center;overflow:hidden;padding:0 1u;line-height:1.05;box-shadow:var(--mi-cx-sombra);}',
    '.mi-bx.m{background:var(--mi-macho);}.mi-bx.f{background:var(--mi-femea);}',
    '.mi-bx.vazio{opacity:.72;font-style:italic;}',
    '.mi-t-velozes .mi-cab,.mi-t-pirata .mi-cab{height:7u;margin-top:1.6u;}',
    '.mi-bx.tem:after{content:"";position:absolute;}',
    '.mi-no.tem>.mi-bx{overflow:visible;}',
    '.mi-no.tem>.mi-bx:after{right:-2.4u;top:50%;width:2.4u;border-top:.45u solid var(--mi-linha);}',
    '.mi-bn{display:block;max-width:100%;text-align:center;font-size:3u;}.mi-ba{display:block;max-width:100%;text-align:center;font-size:2.3u;opacity:.78;margin-top:.2u;}',
    '.mi-no.n0>.mi-bx{width:31u;height:15u;}.mi-no.n0>.mi-bx .mi-bn{font-size:3.5u;}.mi-no.n0>.mi-bx .mi-ba{font-size:2.6u;}',
    '.mi-no.n1>.mi-bx{width:38u;height:10.5u;}.mi-no.n1>.mi-bx .mi-bn{font-size:3.2u;}',
    '.mi-no.n2>.mi-bx{width:42u;height:8.6u;}.mi-no.n2>.mi-bx .mi-bn{font-size:3u;}',
    '.mi-no.n3>.mi-bx{width:55u;height:5.2u;}.mi-no.n3>.mi-bx .mi-bn{font-size:2.9u;}',
    '.mi-no.n2>.mi-fl{gap:.9u;}.mi-no.n1>.mi-fl{gap:1.6u;}.mi-no.n0>.mi-fl{gap:2.4u;}',
    /* folha A4 */
    '.mi-folha{padding:7u 8u;}',
    '.mi-fcab{position:relative;z-index:1;height:38u;display:flex;align-items:center;gap:6u;}',
    '.mi-fcab .mi-logo{width:31u;height:31u;}.mi-fcab .mi-logo .mi-mono{font-size:10u;}',
    '.mi-ftit{flex:1;min-width:0;text-align:center;}',
    '.mi-ftitulo{font-family:var(--mi-ft);font-size:12.5u;color:var(--mi-titulo);text-shadow:var(--mi-titulo-sombra);text-transform:var(--mi-caps);letter-spacing:var(--mi-ls);line-height:1;}',
    '.mi-fnome{margin-top:2.4u;font-family:var(--mi-ft);font-size:7.5u;color:var(--mi-txt);text-transform:var(--mi-caps);line-height:1;}',
    '.mi-fcri{width:62u;flex:none;text-align:right;font-size:3.6u;font-weight:var(--mi-cx-peso);line-height:1.5;color:var(--mi-txt);}',
    '.mi-fcri b{display:block;font-family:var(--mi-ft);font-size:4.6u;color:var(--mi-titulo);font-weight:400;text-shadow:var(--mi-titulo-sombra);}',
    '.mi-farv{position:relative;z-index:1;--u:1.38mm;height:53u;margin-top:1u;}',
    '.mi-farv .mi-arvcorpo{height:100%;justify-content:center;}',
    '.mi-finfo{position:relative;z-index:1;display:flex;flex-direction:column;gap:3u;margin-top:3u;}',
    '.mi-finfo .mi-cx{height:14u;font-size:5u;}',
    '.mi-finfo .mi-lin{gap:3u;}',
    /* ---- enfeites de cada modelo ---- */
    '.mi-t-ouro .mi-deco{background:linear-gradient(115deg,transparent 0,transparent 7%,rgba(255,215,90,.95) 7%,rgba(255,215,90,.95) 8.2%,transparent 8.2%,transparent 10%,rgba(255,196,60,.6) 10%,rgba(255,196,60,.6) 11.2%,transparent 11.2%),linear-gradient(245deg,transparent 0,transparent 90%,rgba(255,215,90,.85) 90%,rgba(255,215,90,.85) 91.2%,transparent 91.2%);}',
    '.mi-t-ouro .mi-frame:before{content:"";position:absolute;left:.9u;top:.9u;right:.9u;bottom:.9u;border:.4u solid rgba(255,215,90,.55);border-radius:1.8u;}',
    '.mi-t-moderno-claro .mi-deco i{left:0;top:0;bottom:0;width:2.2u;background:var(--mi-acento);}',
    '.mi-t-moderno-escuro .mi-deco i{left:0;right:0;bottom:0;height:1.4u;background:var(--mi-acento);}',
    '.mi-t-elegante .mi-frame:before{content:"";position:absolute;left:1.2u;top:1.2u;right:1.2u;bottom:1.2u;border:.35u solid #c9a96a;border-radius:1.4u;}',
    '.mi-t-faroeste .mi-frame:before{content:"";position:absolute;left:1.3u;top:1.3u;right:1.3u;bottom:1.3u;border:.45u solid #8a5a2b;border-radius:.8u;}',
    '.mi-t-faroeste .mi-deco i{left:3u;right:3u;top:3u;bottom:3u;border:.35u dashed rgba(90,52,24,.55);border-radius:.8u;}',
    '.mi-t-matrix .mi-deco{background:repeating-linear-gradient(0deg,rgba(0,255,102,.06) 0,rgba(0,255,102,.06) .3u,transparent .3u,transparent .9u);}',
    '.mi-t-velozes .mi-deco i{left:0;right:0;top:0;height:3u;background-color:#f4f4f4;background-image:linear-gradient(45deg,#15151d 25%,transparent 25%,transparent 75%,#15151d 75%),linear-gradient(45deg,#15151d 25%,transparent 25%,transparent 75%,#15151d 75%);background-size:3u 3u;background-position:0 0,1.5u 1.5u;}',
    '.mi-t-ninja .mi-deco{background:radial-gradient(rgba(255,138,31,.35) .32u,transparent .5u) 0 0/2.4u 2.4u;}',
    '.mi-t-dragao .mi-deco{background:repeating-linear-gradient(100deg,rgba(255,184,0,.13) 0,rgba(255,184,0,.13) 3u,transparent 3u,transparent 9u);}',
    '.mi-t-rio .mi-deco{background:radial-gradient(circle at 8% 14%,rgba(255,61,139,.45) 0,transparent 9u),radial-gradient(circle at 94% 86%,rgba(31,214,163,.45) 0,transparent 10u),radial-gradient(circle at 92% 10%,rgba(255,196,0,.4) 0,transparent 8u);}',
    '.mi-t-pirata .mi-deco i{left:0;right:0;top:0;height:2.6u;background:#d62f3a;border-bottom:.6u solid #f4c430;}'
  ].join('\n');

  function U(s) { return String(s).replace(/(-?\d*\.?\d+)u\b/g, 'calc(var(--u) * $1)'); }

  function garantirCss() {
    if (document.getElementById('mi-css')) return;
    var st = document.createElement('style'); st.id = 'mi-css'; st.textContent = U(CSS_BASE);
    document.head.appendChild(st);
  }
  function estiloVars(id) {
    var m = MODELOS[id] || MODELOS.ouro, o = '';
    Object.keys(m.v).forEach(function (k) { o += '--mi-' + k + ':' + U(m.v[k]) + ';'; });
    return o + '--mi-ft:' + m.ft + ';--mi-fx:' + m.fx + ';';
  }

  /* ---------- fontes ---------- */
  var fontesCarregadas = {};
  function carregarFontes(id) {
    var m = MODELOS[id] || MODELOS.ouro;
    if (!fontesCarregadas[id]) {
      var l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?' + m.fontes + '&display=swap';
      document.head.appendChild(l);
      fontesCarregadas[id] = new Promise(function (ok) {
        var feito = false, fim = function () { if (!feito) { feito = true; ok(); } };
        l.onload = function () {
          var famílias = [m.ft, m.fx].map(function (f) { return f.split(',')[0].trim(); });
          if (document.fonts && document.fonts.load) {
            Promise.all(famílias.map(function (f) { return document.fonts.load('700 16px ' + f); })).then(fim, fim);
          } else fim();
        };
        l.onerror = fim; setTimeout(fim, 4000);
      });
    }
    return fontesCarregadas[id];
  }

  /* ---------- ajuste de texto: encolhe a fonte até caber na caixa ---------- */
  function ajustar(raiz) {
    var ts = raiz.querySelectorAll('.mi-t');
    for (var i = 0; i < ts.length; i++) {
      var t = ts[i], pai = t.closest('.mi-cx,.mi-nome,.mi-bx,.mi-fnome,.mi-fcri,.mi-cab') || t.parentElement, cs = getComputedStyle(pai);   // a caixa de largura real (não o <span> interno)
      var disp = pai.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var tam = parseFloat(getComputedStyle(t).fontSize), min = tam * 0.42, g = 0;
      t.style.fontSize = '';
      while (t.offsetWidth > disp && tam > min && g++ < 80) { tam -= tam * 0.04; t.style.fontSize = tam + 'px'; }
    }
  }

  /* ---------- peças de HTML ---------- */
  function fmtData(v) {
    if (vazio(v)) return '—';
    var p = String(v).slice(0, 10).split('-');
    return p.length === 3 && p[0].length === 4 ? p[2] + '/' + p[1] + '/' + p[0] : String(v);
  }
  function sexoTxt(s) { return s === 'M' ? 'Macho' : (s === 'F' ? 'Fêmea' : 'Indefinido'); }
  function cx(txt, extra) { return '<div class="mi-cx ' + (extra || '') + '"><span class="mi-t">' + esc(txt) + '</span></div>'; }
  var ENF = {
    'moderno-claro': '<i></i>', 'moderno-escuro': '<i></i>', faroeste: '<i></i>', velozes: '<i></i>', pirata: '<i></i>'
  };
  function raizAbre(id, cls, w, h, extraStyle) {
    return '<div class="mi-root mi-t-' + id + ' ' + cls + '" style="--u:1mm;width:' + w + 'mm;height:' + h + 'mm;' + estiloVars(id) + (extraStyle || '') + '">' +
      '<div class="mi-deco">' + (ENF[id] || '') + '</div><div class="mi-frame"></div>';
  }
  function htmlLogo(logo, grande) {
    logo = logo || {};
    var url = logo.url || '';
    if (url) return '<div class="mi-logo"><img src="' + esc(url) + '" alt=""></div>';
    var ini = String(logo.iniciais || '').toUpperCase().slice(0, 3);
    return '<div class="mi-logo"><span class="mi-mono">' + esc(ini) + '</span></div>';
  }
  var AVE_SVG = '<svg viewBox="0 0 100 80"><path d="M12 56Q10 38 30 30Q36 14 54 14Q70 14 76 28L94 34L76 40Q78 58 60 66L66 78L52 70Q30 76 12 56Z" fill="currentColor"/><circle cx="62" cy="26" r="3" fill="#fff" opacity=".85"/></svg>';

  /* ---------- CRACHÁ (193 x 65 mm) ---------- */
  function htmlCracha(d, id, op) {
    op = op || {}; garantirCss();
    var mo = Object.assign({ especie: 1, anilha: 1, nasc: 1, sexo: 1, pai: 1, mae: 1, rodape: 1 }, op.mostrar || {});
    var esp = [d.especie, d.raca].filter(function (x) { return !vazio(x); }).join(' - ');
    var cri = d.criador || {};
    var linhas = '';
    if (mo.especie) linhas += cx(esp || '—');
    if (mo.anilha) linhas += cx(vazio(d.anilha) ? '—' : d.anilha);
    if (mo.nasc || mo.sexo) linhas += '<div class="mi-lin">' + (mo.nasc ? cx(fmtData(d.nasc)) : '') + (mo.sexo ? cx(sexoTxt(d.sexo)) : '') + '</div>';
    if (mo.pai || mo.mae) linhas += '<div class="mi-lin">' + (mo.pai ? cx('Pai: ' + (vazio(d.pai) ? '—' : d.pai), 'mi-baixa') : '') + (mo.mae ? cx('Mãe: ' + (vazio(d.mae) ? '—' : d.mae), 'mi-baixa') : '') + '</div>';
    var rod = mo.rodape ? '<div class="mi-lin mi-rod" style="margin-top:auto;">' + cx(cri.nome || 'Criador') + cx(cri.registro || 'Registro') + cx(cri.telefone || 'Telefone') + '</div>' : '';
    return raizAbre(id, 'mi-cracha', TILE.w, TILE.h) +
      '<div class="mi-corpo"><div class="mi-logo-col">' + htmlLogo(op.logo) + '</div>' +
      '<div class="mi-dados"><div class="mi-nome"><span class="mi-t">' + esc(vazio(d.nome) ? '—' : d.nome) + '</span></div>' + linhas + rod + '</div></div></div>';
  }

  /* ---------- ÁRVORE ---------- */
  function noHtml(caminho, nivel, getNo, d) {
    var n = caminho === '' ? { nome: d.nome, anilha: d.anilha } : (getNo(caminho) || null);
    var nome = n && !vazio(n.nome) ? n.nome : '';
    var sx = caminho === '' ? (d.sexo === 'M' ? 'm' : (d.sexo === 'F' ? 'f' : '')) : (/pai$/.test(caminho) ? 'm' : 'f');
    var tem = nivel < 3;
    var an = (nivel < 3 && n && !vazio(n.anilha)) ? '<span class="mi-ba"><span class="mi-t">' + esc(n.anilha) + '</span></span>' : '';
    var box = '<div class="mi-bx ' + sx + (nome ? '' : ' vazio') + '"><span class="mi-bn"><span class="mi-t">' + esc(nome || 'Indefinido') + '</span></span>' + an + '</div>';
    var fl = '';
    if (tem) {
      var p = caminho ? caminho + '.' : '';
      fl = '<div class="mi-fl">' + noHtml(p + 'pai', nivel + 1, getNo, d) + noHtml(p + 'mae', nivel + 1, getNo, d) + '</div>';
    }
    return '<div class="mi-no n' + nivel + (tem ? ' tem' : '') + '">' + box + fl + '</div>';
  }
  function corpoArvore(d, getNo) {
    return '<div class="mi-arvcorpo"><div class="mi-ave">' + AVE_SVG + '</div>' + noHtml('', 0, getNo, d) + '</div>';
  }
  function htmlArvore(d, getNo, id, op) {
    op = op || {}; garantirCss(); getNo = getNo || function () { return null; };
    var cri = d.criador || {};
    if (op.formato === 'folha') {
      var esp = [d.especie, d.raca].filter(function (x) { return !vazio(x); }).join(' - ');
      return raizAbre(id, 'mi-folha', FOLHA.w, FOLHA.h) +
        '<div class="mi-fcab"><div class="mi-logo-col" style="width:auto;">' + htmlLogo(op.logo) + '</div>' +
        '<div class="mi-ftit"><div class="mi-ftitulo"><span class="mi-t">Árvore Genealógica</span></div><div class="mi-fnome"><span class="mi-t">' + esc(vazio(d.nome) ? '' : d.nome) + '</span></div></div>' +
        '<div class="mi-fcri"><b><span class="mi-t">' + esc(cri.nome || '') + '</span></b>' + esc(cri.registro || '') + '<br>' + esc(cri.telefone || '') + '</div></div>' +
        '<div class="mi-farv">' + corpoArvore(d, getNo) + '</div>' +
        '<div class="mi-finfo"><div class="mi-lin">' + cx(esp || '—') + cx(vazio(d.anilha) ? '—' : d.anilha) + '</div>' +
        '<div class="mi-lin">' + cx('Nascimento: ' + fmtData(d.nasc)) + cx('Sexo: ' + sexoTxt(d.sexo)) + '</div>' +
        '<div class="mi-lin">' + cx('Pai: ' + (vazio(d.pai) ? '—' : d.pai)) + cx('Mãe: ' + (vazio(d.mae) ? '—' : d.mae)) + '</div></div></div>';
    }
    return raizAbre(id, 'mi-arv', TILE.w, TILE.h) +
      '<div class="mi-cab"><span class="mi-est">★</span><span class="mi-t">Árvore Genealógica</span><span class="mi-est">★</span></div>' +
      corpoArvore(d, getNo) + '</div>';
  }

  /* ---------- montar na página (prévia ou área escondida) e preparar ---------- */
  function montar(container, html, id) {
    container.innerHTML = html;
    var el = container.firstElementChild;
    return carregarFontes(id).then(function () { ajustar(el); return el; });
  }

  /* ---------- exportação em alta resolução ---------- */
  function capturar(el, dpi) {
    var escala = (dpi || 350) / 96;
    return window.html2canvas(el, { scale: escala, useCORS: true, allowTaint: true, backgroundColor: null, logging: false });
  }
  function areaEscondida() {
    var a = document.getElementById('mi-escondida');
    if (!a) { a = document.createElement('div'); a.id = 'mi-escondida'; a.style.cssText = 'position:fixed;left:-20000px;top:0;z-index:-1;pointer-events:none;'; document.body.appendChild(a); }
    return a;
  }
  /* itens: [{ html, modelo }]; formato 'tile' (A4 retrato, 4 por página) ou 'folha' (A4 paisagem, 1 por página) */
  async function pdf(itens, op) {
    op = op || {}; var dpi = op.dpi || 350, folha = op.formato === 'folha', jsPDFc = window.jspdf.jsPDF;
    var doc = new jsPDFc(folha ? 'landscape' : 'portrait', 'mm', 'a4');
    var area = areaEscondida(), paginas = [], atual = [], feitos = 0, total = itens.length;
    itens.forEach(function (it) {                    // agrupa em páginas: 4 crachás por A4 (ou 1 folha); "novaPagina" força quebra
      if (folha) { paginas.push([it]); return; }
      if (atual.length === 4 || (it.novaPagina && atual.length)) { paginas.push(atual); atual = []; }
      atual.push(it);
    });
    if (atual.length) paginas.push(atual);
    for (var pi = 0; pi < paginas.length; pi++) {
      if (pi > 0) doc.addPage();
      var pg = paginas[pi], esp = (297 - TILE.h * pg.length) / (pg.length + 1);
      for (var j = 0; j < pg.length; j++) {
        var tmp = document.createElement('div'); area.appendChild(tmp);
        var el = await montar(tmp, pg[j].html, pg[j].modelo);
        await new Promise(function (r) { setTimeout(r, 60); });
        var cv = await capturar(el, dpi), img = cv.toDataURL('image/jpeg', 0.97);
        if (folha) doc.addImage(img, 'JPEG', (297 - FOLHA.w) / 2, (210 - FOLHA.h) / 2, FOLHA.w, FOLHA.h);
        else doc.addImage(img, 'JPEG', (210 - TILE.w) / 2, esp + j * (TILE.h + esp), TILE.w, TILE.h);
        area.removeChild(tmp); feitos++;
        if (op.progresso) op.progresso(feitos, total);
      }
    }
    return doc;
  }
  async function png(html, id, dpi) {
    var tmp = document.createElement('div'); areaEscondida().appendChild(tmp);
    var el = await montar(tmp, html, id);
    await new Promise(function (r) { setTimeout(r, 60); });
    var cv = await capturar(el, dpi || 400);
    tmp.remove();
    return new Promise(function (ok) { cv.toBlob(ok, 'image/png'); });
  }
  function baixar(blob, nome) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  /* ---------- imagens de logo em ALTA qualidade (não destrói a transparência) ---------- */
  function logoHD(file, max) {
    return new Promise(function (ok, err) {
      var r = new FileReader();
      r.onerror = function () { err(new Error('Não consegui ler a imagem.')); };
      r.onload = function (e) {
        var im = new Image();
        im.onerror = function () { err(new Error('Imagem inválida.')); };
        im.onload = function () {
          var tent = [max || 900, 700, 520, 400], k, saida = '';
          for (k = 0; k < tent.length; k++) {
            var lado = tent[k], w = im.width, h = im.height;
            if (w > lado || h > lado) { if (w >= h) { h = Math.round(h * lado / w); w = lado; } else { w = Math.round(w * lado / h); h = lado; } }
            var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
            var cx2 = cv.getContext('2d'); cx2.imageSmoothingQuality = 'high'; cx2.drawImage(im, 0, 0, w, h);
            saida = cv.toDataURL('image/png');                              // PNG mantém o fundo transparente
            if (saida.length > 1100000) saida = cv.toDataURL('image/jpeg', 0.93);   // muito pesado: JPEG de alta qualidade
            if (saida.length <= 1100000) break;
          }
          ok(saida);
        };
        im.src = e.target.result;
      };
      r.readAsDataURL(file);
    });
  }

  root.ModelosImpressao = {
    TILE: TILE, FOLHA: FOLHA, MODELOS: MODELOS,
    lista: function () { return Object.keys(MODELOS).map(function (k) { return { id: k, nome: MODELOS[k].nome, emoji: MODELOS[k].emoji }; }); },
    htmlCracha: htmlCracha, htmlArvore: htmlArvore, montar: montar, ajustar: ajustar, carregarFontes: carregarFontes,
    capturar: capturar, pdf: pdf, png: png, baixar: baixar, logoHD: logoHD, garantirCss: garantirCss
  };
})(window);
