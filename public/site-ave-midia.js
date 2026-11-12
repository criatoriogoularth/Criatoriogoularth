// site-ave-midia.js — botões de ação (Fotos, Vídeo, CIG, Sexagem) das aves do site
// e a janela que mostra cada um. Usado por Plantel, Filhotes e Adultos.
//
// Como usar numa página:
//   <script src="site-ave-midia.js"></script>
//   AveMidia.botoes(ave)    -> HTML dos botões (só aparecem os que a ave tem)
//   AveMidia.capa(ave)      -> HTML da foto grande (para cards)
//   AveMidia.miniatura(ave) -> HTML da foto pequena (para tabelas)
// Qualquer elemento com data-midia="foto|video|cig|sexagem" data-id="ID" abre a janela.
//
// "Voltar": a janela é aberta SEM sair da página e registra uma entrada no histórico,
// então o botão voltar do celular/navegador apenas FECHA a janela e você continua
// exatamente onde estava (mesma lista, mesma rolagem).
(function () {
  var API = '/api/aves/publico';

  var CSS = '' +
    '.btn-midia{padding:4px 12px;font-size:11px;border-radius:6px;border:1px solid var(--line);background:transparent;color:var(--text-muted);cursor:pointer;font-family:var(--font-texto,inherit);transition:.15s ease;text-decoration:none;display:inline-block;line-height:1.5}' +
    '.btn-midia:hover{border-color:var(--brass-dim);color:var(--text)}' +
    '.btn-midia.m-foto,.btn-midia.m-video{border-color:var(--brass-dim);color:var(--brass-soft)}' +
    '.btn-midia.m-cig,.btn-midia.m-sexagem{border-color:rgba(var(--sage-rgb,92,154,124),.35);color:var(--sage-soft,#8fc4a6)}' +
    '.am-acoes{display:flex;gap:4px;flex-wrap:wrap}' +
    '.am-capa{display:block;width:calc(100% + 36px);margin:-16px -18px 12px;height:180px;object-fit:cover;border-radius:var(--radius,14px) var(--radius,14px) 0 0;cursor:zoom-in;background:rgba(0,0,0,.25)}' +
    '.am-nome{white-space:nowrap}' +
    '.am-mini{width:42px;height:42px;border-radius:8px;object-fit:cover;vertical-align:middle;margin-right:10px;cursor:zoom-in;border:1px solid var(--line);background:rgba(0,0,0,.25)}' +
    'body.am-lock{overflow:hidden}' +
    '.am-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.82);display:none;align-items:center;justify-content:center;padding:14px}' +
    '.am-overlay.on{display:flex}' +
    '.am-box{background:var(--bg-elevated,#13241e);color:var(--text,#eee);border:1px solid var(--line,#333);border-radius:14px;width:100%;max-width:860px;max-height:100%;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5)}' +
    '.am-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line,#333)}' +
    '.am-titulo{font-family:var(--font-titulo,inherit);font-size:18px;font-weight:700;min-width:0}' +
    '.am-titulo small{display:block;font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:400;color:var(--brass-soft,#e0bd7c);margin-top:2px}' +
    '.am-fechar{flex:none;width:38px;height:38px;border-radius:50%;border:1px solid var(--line,#333);background:transparent;color:var(--text,#eee);font-size:18px;cursor:pointer}' +
    '.am-fechar:hover{border-color:var(--brass-dim)}' +
    '.am-tabs{display:flex;gap:6px;padding:10px 16px 0;flex-wrap:wrap}' +
    '.am-tabs button{padding:7px 14px;border-radius:999px;border:1px solid var(--line,#333);background:transparent;color:var(--text-muted,#aaa);font-size:13px;cursor:pointer;font-family:inherit}' +
    '.am-tabs button.on{background:rgba(var(--accent-rgb,199,151,63),.15);border-color:var(--brass-dim,#8a6a2b);color:var(--brass-soft,#e0bd7c);font-weight:600}' +
    '.am-body{padding:14px 16px 18px;overflow:auto;-webkit-overflow-scrolling:touch}' +
    '.am-vazio,.am-carregando{text-align:center;color:var(--text-muted,#aaa);padding:30px 10px}' +
    '.am-galeria{position:relative;text-align:center}' +
    '.am-galeria .am-img{max-width:100%;max-height:62vh;border-radius:10px;cursor:zoom-in;background:rgba(0,0,0,.25)}' +
    '.am-galeria.zoom{overflow:auto;max-height:68vh}' +
    '.am-galeria.zoom .am-img{max-width:none;max-height:none;width:180%;cursor:zoom-out}' +
    '.am-nav{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;border-radius:50%;border:none;background:rgba(0,0,0,.55);color:#fff;font-size:22px;cursor:pointer}' +
    '.am-nav.ant{left:6px}.am-nav.prox{right:6px}' +
    '.am-contador{font-size:12px;color:var(--text-muted,#aaa);margin-top:8px}' +
    '.am-thumbs{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:10px}' +
    '.am-thumbs img{width:58px;height:58px;object-fit:cover;border-radius:8px;border:2px solid transparent;cursor:pointer;opacity:.7}' +
    '.am-thumbs img.on{border-color:var(--brass,#c7973f);opacity:1}' +
    '.am-video{position:relative;padding-top:56.25%;border-radius:10px;overflow:hidden;background:#000}' +
    '.am-video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}' +
    '.am-doc-titulo{font-size:13px;color:var(--text-muted,#aaa);margin-bottom:6px}' +
    '.am-cig-num{font-family:"JetBrains Mono",monospace;font-size:22px;color:var(--brass-soft,#e0bd7c);word-break:break-all;margin-bottom:14px}' +
    '.am-doc img{max-width:100%;border-radius:10px;background:#fff;cursor:zoom-in}' +
    '.am-doc.zoom{overflow:auto;max-height:68vh}.am-doc.zoom img{max-width:none;width:180%;cursor:zoom-out}' +
    '.am-doc iframe{width:100%;height:62vh;border:1px solid var(--line,#333);border-radius:10px;background:#fff}' +
    '.am-link{display:inline-block;margin-top:12px;padding:9px 16px;border-radius:8px;border:1px solid var(--brass-dim,#8a6a2b);background:rgba(var(--accent-rgb,199,151,63),.12);color:var(--brass-soft,#e0bd7c);text-decoration:none;font-size:13px;font-weight:600}' +
    '.am-sexo{display:inline-block;padding:4px 14px;border-radius:999px;font-weight:700;font-size:14px;margin-bottom:14px}' +
    '.am-sexo.M{background:rgba(70,130,200,.18);color:#7fb0e0}.am-sexo.F{background:rgba(200,100,130,.18);color:#f0a8b8}.am-sexo.I{background:rgba(var(--accent-rgb,199,151,63),.15);color:var(--brass-soft,#e0bd7c)}';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function arquivo(id, tipo, i, v) {
    return API + '/arquivo/' + id + '/' + tipo + (i != null ? '/' + i : '') + '?v=' + (v || 0);
  }

  // Aceita os formatos comuns de link do YouTube (e Vimeo) e devolve o endereço de "embed".
  function embedDoVideo(url) {
    if (!url) return null;
    var m = String(url).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
    if (m) return 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0';
    m = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (m) return 'https://player.vimeo.com/video/' + m[1];
    return null;
  }

  var overlay, elTitulo, elTabs, elBody;
  var aberto = false, empurrou = false, dados = null, abaAtual = null, fotoAtual = 0;
  var cache = {};

  function montar() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'am-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML =
      '<div class="am-box">' +
        '<div class="am-head"><div class="am-titulo"></div>' +
        '<button type="button" class="am-fechar" aria-label="Fechar">✕</button></div>' +
        '<div class="am-tabs"></div><div class="am-body"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    elTitulo = overlay.querySelector('.am-titulo');
    elTabs = overlay.querySelector('.am-tabs');
    elBody = overlay.querySelector('.am-body');

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('.am-fechar')) fechar();
    });
    document.addEventListener('keydown', function (e) {
      if (!aberto) return;
      if (e.key === 'Escape') fechar();
      if (abaAtual === 'foto' && e.key === 'ArrowLeft') irFoto(fotoAtual - 1);
      if (abaAtual === 'foto' && e.key === 'ArrowRight') irFoto(fotoAtual + 1);
    });

    // Botão voltar do celular/navegador: só fecha a janela.
    window.addEventListener('popstate', function () {
      if (aberto) { empurrou = false; fechar(true); }
    });

    // Deslizar o dedo para trocar de foto.
    var x0 = null;
    elBody.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    elBody.addEventListener('touchend', function (e) {
      if (x0 === null || abaAtual !== 'foto' || overlay.querySelector('.am-galeria.zoom')) { x0 = null; return; }
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) irFoto(fotoAtual + (dx < 0 ? 1 : -1));
    }, { passive: true });

    elBody.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('.am-nav.ant')) return irFoto(fotoAtual - 1);
      if (t.closest('.am-nav.prox')) return irFoto(fotoAtual + 1);
      var th = t.closest('.am-thumbs img');
      if (th) return irFoto(parseInt(th.getAttribute('data-i'), 10));
      var z = t.closest('.am-img, .am-doc img');
      if (z) { var c = z.closest('.am-galeria, .am-doc'); if (c) c.classList.toggle('zoom'); }
    });
  }

  function fechar(viaPopstate) {
    if (!aberto) return;
    aberto = false;
    overlay.classList.remove('on');
    document.body.classList.remove('am-lock');
    elBody.innerHTML = ''; // para o vídeo de verdade ao fechar
    if (!viaPopstate && empurrou) { empurrou = false; history.back(); }
  }

  function abas() {
    var a = [];
    if (dados.numFotos > 0) a.push(['foto', '📷 Fotos']);
    if (dados.videoUrl) a.push(['video', '🎥 Vídeo']);
    if (dados.cigNumero || dados.cigTipo) a.push(['cig', '🧬 CIG']);
    if (dados.sexagemTipo) a.push(['sexagem', '⚥ Sexagem']);
    return a;
  }

  function desenharAbas() {
    elTabs.innerHTML = abas().map(function (a) {
      return '<button type="button" data-aba="' + a[0] + '" class="' + (a[0] === abaAtual ? 'on' : '') + '">' + a[1] + '</button>';
    }).join('');
    Array.prototype.forEach.call(elTabs.querySelectorAll('button'), function (b) {
      b.onclick = function () { mostrar(b.getAttribute('data-aba')); };
    });
  }

  function irFoto(i) {
    if (!dados || !dados.numFotos) return;
    fotoAtual = (i + dados.numFotos) % dados.numFotos;
    mostrar('foto', true);
  }

  function visualizadorArquivo(tipoArq, url, rotulo) {
    if (tipoArq === 'pdf') {
      return '<div class="am-doc"><iframe src="' + url + '" title="' + esc(rotulo) + '"></iframe></div>' +
             '<a class="am-link" href="' + url + '" target="_blank" rel="noopener">📄 Abrir / baixar PDF</a>';
    }
    return '<div class="am-doc"><img src="' + url + '" alt="' + esc(rotulo) + '"></div>' +
           '<div class="am-contador">Toque na imagem para ampliar</div>';
  }

  function mostrar(aba, manterFoto) {
    abaAtual = aba;
    if (aba === 'foto' && !manterFoto) fotoAtual = 0;
    desenharAbas();
    var h = '';
    if (aba === 'foto') {
      var n = dados.numFotos, thumbs = '';
      if (n > 1) {
        for (var i = 0; i < n; i++) {
          thumbs += '<img src="' + arquivo(dados.id, 'foto', i, dados.v) + '" data-i="' + i + '" class="' + (i === fotoAtual ? 'on' : '') + '" alt="Foto ' + (i + 1) + '" loading="lazy">';
        }
      }
      h = '<div class="am-galeria">' +
            '<img class="am-img" src="' + arquivo(dados.id, 'foto', fotoAtual, dados.v) + '" alt="' + esc(dados.nome) + '">' +
            (n > 1 ? '<button type="button" class="am-nav ant" aria-label="Foto anterior">‹</button><button type="button" class="am-nav prox" aria-label="Próxima foto">›</button>' : '') +
          '</div>' +
          (n > 1 ? '<div class="am-contador" style="text-align:center">' + (fotoAtual + 1) + ' de ' + n + '</div><div class="am-thumbs">' + thumbs + '</div>' : '<div class="am-contador" style="text-align:center">Toque na foto para ampliar</div>');
    } else if (aba === 'video') {
      var emb = embedDoVideo(dados.videoUrl);
      h = emb
        ? '<div class="am-video"><iframe src="' + esc(emb) + '" title="Vídeo de ' + esc(dados.nome) + '" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>' +
          '<a class="am-link" href="' + esc(dados.videoUrl) + '" target="_blank" rel="noopener">▶ Abrir no site do vídeo</a>'
        : '<div class="am-vazio">Este vídeo abre no site de origem.</div><a class="am-link" href="' + esc(dados.videoUrl) + '" target="_blank" rel="noopener">▶ Assistir ao vídeo</a>';
    } else if (aba === 'cig') {
      h = '<div class="am-doc-titulo">Genotipagem C.I.G. — Código de Identidade Genética</div>' +
          (dados.cigNumero ? '<div class="am-cig-num">' + esc(dados.cigNumero) + '</div>' : '') +
          (dados.cigTipo ? visualizadorArquivo(dados.cigTipo, arquivo(dados.id, 'cig', null, dados.v), 'CIG de ' + dados.nome) : '');
    } else if (aba === 'sexagem') {
      var cls = dados.sexo === 'M' ? 'M' : dados.sexo === 'F' ? 'F' : 'I';
      var lbl = dados.sexo === 'M' ? '♂ Macho' : dados.sexo === 'F' ? '♀ Fêmea' : 'Sexo não informado';
      h = '<div class="am-doc-titulo">Laudo de sexagem (exame de DNA)</div>' +
          '<div class="am-sexo ' + cls + '">' + lbl + '</div>' +
          visualizadorArquivo(dados.sexagemTipo, arquivo(dados.id, 'sexagem', null, dados.v), 'Laudo de sexagem de ' + dados.nome);
    }
    elBody.innerHTML = h;
  }

  function abrir(id, aba) {
    montar();
    aberto = true;
    overlay.classList.add('on');
    document.body.classList.add('am-lock');
    if (!empurrou) { history.pushState({ aveMidia: true }, '', location.href); empurrou = true; }
    elTitulo.textContent = '';
    elTabs.innerHTML = '';
    elBody.innerHTML = '<div class="am-carregando">Carregando…</div>';

    var pronto = cache[id]
      ? Promise.resolve(cache[id])
      : fetch(API + '/midia/' + id).then(function (r) { if (!r.ok) throw new Error(); return r.json(); });

    pronto.then(function (d) {
      cache[id] = d; dados = d;
      elTitulo.innerHTML = esc(d.nome) + (d.anilha ? '<small>' + esc(d.anilha) + '</small>' : '');
      var lista = abas();
      if (!lista.length) { elBody.innerHTML = '<div class="am-vazio">Esta ave ainda não tem fotos ou documentos.</div>'; return; }
      var existe = lista.some(function (a) { return a[0] === aba; });
      mostrar(existe ? aba : lista[0][0]);
    }).catch(function () {
      elBody.innerHTML = '<div class="am-vazio">Não foi possível carregar agora. Tente novamente em instantes.</div>';
    });
  }

  // Clique em qualquer elemento com data-midia (botões, foto do card, miniatura).
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-midia]');
    if (!el || overlay && overlay.contains(el)) return;
    e.preventDefault();
    abrir(parseInt(el.getAttribute('data-id'), 10), el.getAttribute('data-midia'));
  });

  function botao(tipo, rotulo, a) {
    return '<button type="button" class="btn-midia m-' + tipo + '" data-midia="' + tipo + '" data-id="' + a.id + '">' + rotulo + '</button>';
  }

  window.AveMidia = {
    abrir: abrir,
    embedDoVideo: embedDoVideo,
    botoes: function (a) {
      var h = '';
      if (a.temFoto) h += botao('foto', '📷 Fotos', a);
      if (a.temVideo) h += botao('video', '🎥 Vídeo', a);
      if (a.temCig) h += botao('cig', '🧬 CIG', a);
      if (a.temSexagem) h += botao('sexagem', '⚥ Sexagem', a);
      return h;
    },
    capa: function (a) {
      if (!a.temFoto) return '';
      return '<img class="am-capa" src="' + arquivo(a.id, 'foto', 0, a.v) + '" alt="' + esc(a.nome) + '" loading="lazy" data-midia="foto" data-id="' + a.id + '">';
    },
    miniatura: function (a) {
      if (!a.temFoto) return '';
      return '<img class="am-mini" src="' + arquivo(a.id, 'foto', 0, a.v) + '" alt="' + esc(a.nome) + '" loading="lazy" data-midia="foto" data-id="' + a.id + '">';
    }
  };

  // CSS dos botões entra já na carga da página (a janela em si só é montada no primeiro clique)
  var st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
})();
