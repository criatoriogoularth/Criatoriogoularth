// site-mensagem.js — janela "Reservar / Tirar dúvida" do site público.
// A mensagem fica guardada no sistema e aparece em "Avisos" no Painel do criador.
//
//   SiteMensagem.abrir({ id, nome, anilha, tipoAve: 'filhote' | 'adulto' }, 'reserva' | 'duvida')
//
// A janela só fecha pelo ✕, por "Cancelar"/"Fechar" ou pelo botão voltar do aparelho
// (clicar fora não fecha, para ninguém perder o que digitou).
(function () {
  var TELEFONE_WHATSAPP = '5511941493657';
  var API = '/api/mensagens';

  var CSS = '' +
    '.sm-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.8);display:none;align-items:center;justify-content:center;padding:14px}' +
    '.sm-overlay.on{display:flex}' +
    '.sm-box{background:var(--bg-elevated,#13241e);color:var(--text,#eee);border:1px solid var(--line,#333);border-radius:14px;width:100%;max-width:460px;max-height:100%;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.5)}' +
    '.sm-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line,#333)}' +
    '.sm-titulo{font-family:var(--font-titulo,inherit);font-size:18px;font-weight:700}' +
    '.sm-titulo small{display:block;font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:400;color:var(--brass-soft,#e0bd7c);margin-top:2px}' +
    '.sm-x{flex:none;width:38px;height:38px;border-radius:50%;border:1px solid var(--line,#333);background:transparent;color:inherit;font-size:18px;cursor:pointer}' +
    '.sm-corpo{padding:14px 16px 18px}' +
    '.sm-tipos{display:flex;gap:8px;margin-bottom:12px}' +
    '.sm-tipos button{flex:1;padding:9px 6px;border-radius:999px;border:1px solid var(--line,#333);background:transparent;color:var(--text-muted,#aaa);font-size:13px;cursor:pointer;font-family:inherit}' +
    '.sm-tipos button.on{background:rgba(199,151,63,.15);border-color:var(--brass-dim,#8a6a2b);color:var(--brass-soft,#e0bd7c);font-weight:600}' +
    '.sm-corpo label{display:block;font-size:12px;color:var(--text-muted,#aaa);margin:10px 0 4px}' +
    '.sm-corpo input[type=text],.sm-corpo textarea{width:100%;box-sizing:border-box;padding:10px 11px;border-radius:8px;border:1px solid var(--line,#333);background:rgba(0,0,0,.25);color:inherit;font-size:15px;font-family:inherit}' +
    '.sm-corpo textarea{min-height:84px;resize:vertical}' +
    '.sm-honey{position:absolute;left:-9999px;opacity:0;height:0;overflow:hidden}' +
    '.sm-erro{color:#f0a8a0;font-size:13px;margin-top:10px;min-height:16px}' +
    '.sm-acoes{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}' +
    '.sm-btn{padding:10px 18px;border-radius:8px;border:1px solid var(--line,#333);background:transparent;color:inherit;font-size:14px;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-block}' +
    '.sm-btn.pri{background:var(--brass,#c7973f);border-color:var(--brass,#c7973f);color:#1a1405;font-weight:700}' +
    '.sm-btn:disabled{opacity:.6;cursor:wait}' +
    '.sm-ok{text-align:center;padding:10px 4px}.sm-ok .ic{font-size:42px}.sm-ok p{color:var(--text-muted,#aaa);font-size:14px;line-height:1.5}';

  var overlay, st = {}, aberto = false, empurrou = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function montar() {
    if (overlay) return;
    var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    overlay = document.createElement('div');
    overlay.className = 'sm-overlay';
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) {
      if (e.target.closest('[data-sm-fechar]')) fechar();
    });
    window.addEventListener('popstate', function () { if (aberto) { empurrou = false; fechar(true); } });
  }

  function fechar(viaPop) {
    if (!aberto) return;
    aberto = false;
    overlay.classList.remove('on');
    overlay.innerHTML = '';
    document.body.style.overflow = '';
    if (!viaPop && empurrou) { empurrou = false; history.back(); }
  }

  function desenhar() {
    var a = st.ave;
    var ehReserva = st.tipo === 'reserva';
    overlay.innerHTML =
      '<div class="sm-box">' +
        '<div class="sm-head"><div class="sm-titulo">' + (ehReserva ? '📩 Reservar' : '❓ Tirar dúvida') + ' — ' + esc(a.nome) +
          (a.anilha ? '<small>' + esc(a.anilha) + '</small>' : '') + '</div>' +
          '<button type="button" class="sm-x" data-sm-fechar aria-label="Fechar">✕</button></div>' +
        '<div class="sm-corpo">' +
          '<div class="sm-tipos">' +
            '<button type="button" data-tipo="reserva" class="' + (ehReserva ? 'on' : '') + '">📩 Quero reservar</button>' +
            '<button type="button" data-tipo="duvida" class="' + (!ehReserva ? 'on' : '') + '">❓ Tenho uma dúvida</button>' +
          '</div>' +
          '<label for="sm-nome">Seu nome *</label><input type="text" id="sm-nome" autocomplete="name" maxlength="120" value="' + esc(st.nome || '') + '">' +
          '<label for="sm-contato">Seu WhatsApp (com DDD) ou e-mail *</label><input type="text" id="sm-contato" autocomplete="tel" maxlength="160" value="' + esc(st.contato || '') + '">' +
          '<label for="sm-msg">' + (ehReserva ? 'Mensagem (opcional)' : 'Sua dúvida *') + '</label>' +
          '<textarea id="sm-msg" maxlength="2000" placeholder="' + (ehReserva ? 'Ex.: Tenho interesse e gostaria de combinar a retirada.' : 'Escreva aqui o que você quer saber.') + '">' + esc(st.msg || '') + '</textarea>' +
          '<div class="sm-honey"><label>Não preencha<input type="text" id="sm-website" tabindex="-1" autocomplete="off"></label></div>' +
          '<div class="sm-erro" id="sm-erro"></div>' +
          '<div class="sm-acoes">' +
            '<button type="button" class="sm-btn pri" id="sm-enviar">Enviar</button>' +
            '<button type="button" class="sm-btn" data-sm-fechar>Cancelar</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    Array.prototype.forEach.call(overlay.querySelectorAll('.sm-tipos button'), function (b) {
      b.onclick = function () { guardarCampos(); st.tipo = b.getAttribute('data-tipo'); desenhar(); };
    });
    document.getElementById('sm-enviar').onclick = enviar;
  }

  function guardarCampos() {
    st.nome = document.getElementById('sm-nome').value;
    st.contato = document.getElementById('sm-contato').value;
    st.msg = document.getElementById('sm-msg').value;
  }

  function enviar() {
    guardarCampos();
    var erro = document.getElementById('sm-erro'), btn = document.getElementById('sm-enviar');
    var nome = st.nome.trim(), contato = st.contato.trim(), msg = st.msg.trim();
    if (nome.length < 2) { erro.textContent = 'Informe seu nome.'; return; }
    if (contato.length < 5) { erro.textContent = 'Informe seu WhatsApp (com DDD) ou e-mail para retornarmos.'; return; }
    if (st.tipo === 'duvida' && msg.length < 2) { erro.textContent = 'Escreva sua dúvida.'; return; }
    erro.textContent = ''; btn.disabled = true; btn.textContent = 'Enviando...';

    fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: st.tipo, nome: nome, contato: contato, mensagem: msg, aveId: st.ave.id,
        assunto: (st.tipo === 'reserva' ? 'Reserva: ' : 'Dúvida: ') + st.ave.nome,
        website: document.getElementById('sm-website').value
      })
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || 'Não foi possível enviar agora.');
      });
    }).then(function () {
      var texto = (st.tipo === 'reserva'
        ? 'Olá! Tenho interesse em reservar ' + st.ave.nome + (st.ave.anilha ? ' (' + st.ave.anilha + ')' : '') + '. Meu nome é ' + nome + '.'
        : 'Olá! Tenho uma dúvida sobre ' + st.ave.nome + (st.ave.anilha ? ' (' + st.ave.anilha + ')' : '') + '. Meu nome é ' + nome + '.');
      overlay.innerHTML =
        '<div class="sm-box"><div class="sm-head"><div class="sm-titulo">Mensagem enviada</div>' +
        '<button type="button" class="sm-x" data-sm-fechar aria-label="Fechar">✕</button></div>' +
        '<div class="sm-corpo sm-ok"><div class="ic">✅</div>' +
        '<p>Recebemos ' + (st.tipo === 'reserva' ? 'seu pedido de reserva' : 'sua dúvida') + ' e vamos entrar em contato o quanto antes.</p>' +
        '<div class="sm-acoes" style="justify-content:center">' +
        '<a class="sm-btn pri" target="_blank" rel="noopener" href="https://wa.me/' + TELEFONE_WHATSAPP + '?text=' + encodeURIComponent(texto) + '">💬 Falar também pelo WhatsApp</a>' +
        '<button type="button" class="sm-btn" data-sm-fechar>Fechar</button></div></div></div>';
    }).catch(function (e) {
      erro.textContent = e.message || 'Não foi possível enviar agora.';
      btn.disabled = false; btn.textContent = 'Enviar';
    });
  }

  window.SiteMensagem = {
    abrir: function (ave, tipo) {
      montar();
      st = { ave: ave, tipo: tipo === 'duvida' ? 'duvida' : 'reserva', nome: '', contato: '', msg: '' };
      aberto = true;
      overlay.classList.add('on');
      document.body.style.overflow = 'hidden';
      if (!empurrou) { history.pushState({ siteMensagem: true }, '', location.href); empurrou = true; }
      desenhar();
    }
  };
})();
