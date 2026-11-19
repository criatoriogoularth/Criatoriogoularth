// auth-client.js — confere a sessão no servidor e mostra avisos do plano.
//
// "Estar logado" é decidido pelo servidor (GET /api/auth/me). Aqui também:
//  - dono da plataforma vai para o painel do dono;
//  - teste acabado / plano vencido vai para a tela de planos;
//  - mostra "Teste grátis: faltam N dias" e o botão de enviar sugestão.
(function () {
  const page = window.location.pathname.split('/').pop() || 'index.html';

  const paginasPublicas = [
    'index.html', 'login.html', 'cadastro.html', 'termos.html', 'esqueci.html', 'redefinir.html', 'confirmar.html',
    'site-home.html', 'site-criatorio.html', 'site-noticias.html',
    'site-plantel.html', 'site-adultos.html', 'site-filhotes.html',
    'site-fotos.html', 'site-videos.html', 'site-contato.html',
    'site-certificado.html'
  ];

  if (paginasPublicas.includes(page) || page.startsWith('site-')) return;

  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'login.html'; return; }

  fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => { if (!res.ok) throw new Error('Token inválido'); return res.json(); })
    .then((usuario) => {
      window.USUARIO_LOGADO = usuario;
      window.USUARIO_EH_ADMIN = usuario.role === 'admin';

      if (usuario.role === 'dono') {
        if (page !== 'dono.html') window.location.href = 'dono.html';
        return;
      }
      if (page === 'dono.html') { window.location.href = 'dashboard.html'; return; }
      if (usuario.acesso && !usuario.acesso.ativo && page !== 'plano.html') {
        window.location.href = 'plano.html';
        return;
      }
      if (page !== 'plano.html') avisoDoPlano(usuario);
      aplicarRegrasDoPlano(usuario);
      if (usuario.emailConfirmado === false) avisoEmail();
      botaoSugestao();
    })
    .catch(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = 'login.html';
    });

  // ---------- o que o plano permite ----------
  // Plano "só site": gerenciador reduzido (cadastro de aves + árvore) e SEM impressão.
  // O servidor também recusa o que está fora do plano; aqui só se esconde para não confundir.
  const FORA_DO_PLANO_REDUZIDO = ['reproducao.html', 'crachas.html', 'importar-arvore.html', 'simulador-arvore.html', 'anilhas.html'];

  function aplicarRegrasDoPlano(u) {
    const plano = u.plano || {};
    const reduzido = plano.gerenciador && plano.gerenciador !== 'completo';
    const semImpressao = plano.imprimir === false;

    if (reduzido) {
      if (FORA_DO_PLANO_REDUZIDO.includes(page)) {
        sessionStorage.setItem('aviso-plano', 'Este recurso não faz parte do seu plano.');
        window.location.href = 'dashboard.html';
        return;
      }
      ocultarLinks(FORA_DO_PLANO_REDUZIDO);
      const aviso = sessionStorage.getItem('aviso-plano');
      if (aviso) { sessionStorage.removeItem('aviso-plano'); setTimeout(() => alert('ℹ️ ' + aviso), 300); }
    }

    if (semImpressao) {
      // Botões de imprimir/PDF somem, a impressão do navegador fica em branco e o atalho é barrado.
      const st = document.createElement('style');
      st.textContent = '@media print{body{display:none !important;}}'
        + '[onclick*="PDF"],[onclick*="print"],[onclick*="imprimir"],[onclick*="Imprimir"]{display:none !important;}';
      document.head.appendChild(st);
      window.print = function () { alert('Impressão não está disponível no seu plano.'); };
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'p') { e.preventDefault(); }
      });
      window.PLANO_SEM_IMPRESSAO = true;
    }
  }

  // Esconde itens do menu lateral (que é montado um pouco depois da página).
  function ocultarLinks(paginas) {
    const esconder = () => paginas.forEach((p) => {
      document.querySelectorAll('a[href="' + p + '"]').forEach((a) => { a.style.display = 'none'; });
    });
    esconder();
    const obs = new MutationObserver(esconder);
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => obs.disconnect(), 6000);
  }

  // ---------- faixa pequena com o prazo do teste ----------
  function avisoDoPlano(u) {
    const a = u.acesso;
    if (!a) return;
    let texto = null;
    if (a.somenteLeitura) texto = `⚠️ Plano vencido — só consulta. Restam ${a.diasRestantes} dia(s) de carência.`;
    else if (a.tipo === 'teste') texto = `⏳ Teste grátis: ${a.diasRestantes} dia(s) restante(s)`;
    else if (a.tipo === 'ativo' && a.diasRestantes != null && a.diasRestantes <= 15) texto = `🔔 Seu plano vence em ${a.diasRestantes} dia(s)`;
    if (!texto) return;
    const el = document.createElement('a');
    el.href = 'plano.html';
    el.textContent = texto + ' · Ver planos';
    el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:900;background:#2a2417;color:#e6c27a;border:1px solid #c7973f;'
      + 'border-radius:999px;padding:8px 14px;font:600 12px Manrope,sans-serif;text-decoration:none;box-shadow:0 4px 16px rgba(0,0,0,.35);max-width:calc(100vw - 90px);';
    document.body.appendChild(el);
  }

  // ---------- e-mail ainda não confirmado ----------
  function avisoEmail() {
    if (sessionStorage.getItem('aviso-email-fechado')) return;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:12px;right:70px;bottom:56px;z-index:900;max-width:420px;background:#1a2420;color:#e8e6df;border:1px solid #3a4a40;border-radius:12px;padding:10px 12px;font:12.5px Manrope,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.35);';
    el.innerHTML = '✉️ Confirme o seu e-mail (enviamos um link). <a href="#" id="reenv" style="color:#e6c27a;">Reenviar</a> · <a href="#" id="fecha-em" style="color:#9aa;">fechar</a>';
    document.body.appendChild(el);
    document.getElementById('fecha-em').onclick = (e) => { e.preventDefault(); sessionStorage.setItem('aviso-email-fechado', '1'); el.remove(); };
    document.getElementById('reenv').onclick = async (e) => {
      e.preventDefault();
      try {
        const r = await fetch('/api/auth/reenviar-confirmacao', { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
        const d = await r.json();
        el.textContent = r.ok ? (d.jaConfirmado ? '✅ Já está confirmado.' : (d.modoTeste ? 'ℹ️ O envio de e-mail ainda não está ativado neste servidor.' : '✅ Enviamos de novo. Veja a caixa de entrada e o spam.')) : '❌ ' + (d.error || 'Erro');
      } catch (er) { el.textContent = '❌ Sem conexão.'; }
      setTimeout(() => el.remove(), 5000);
    };
  }

  // ---------- botão "Enviar sugestão ou problema" ----------
  function botaoSugestao() {
    const b = document.createElement('button');
    b.textContent = '💬';
    b.title = 'Enviar sugestão ou problema';
    b.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:900;width:46px;height:46px;border-radius:50%;border:1px solid #c7973f;'
      + 'background:#2a2417;color:#e6c27a;font-size:20px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.35);';
    b.onclick = abrirSugestao;
    document.body.appendChild(b);
  }

  function abrirSugestao() {
    if (document.getElementById('sug-fundo')) return;
    const f = document.createElement('div');
    f.id = 'sug-fundo';
    f.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;';
    f.innerHTML = `
      <div style="background:#1a2420;border:1px solid #3a4a40;border-radius:14px;padding:20px;width:100%;max-width:440px;color:#e8e6df;font-family:Manrope,sans-serif;">
        <div style="font-weight:700;font-size:16px;margin-bottom:4px;">💬 Sugestão ou problema</div>
        <div style="font-size:12px;opacity:.7;margin-bottom:12px;">Conte o que achou ou o que não funcionou. Isso ajuda a melhorar o sistema.</div>
        <select id="sug-tipo" style="width:100%;padding:9px;border-radius:8px;border:1px solid #3a4a40;background:#121a17;color:#e8e6df;margin-bottom:8px;font-size:16px;">
          <option value="problema">🐞 Algo não funcionou</option>
          <option value="sugestao">💡 Tenho uma sugestão</option>
          <option value="duvida">❓ Tenho uma dúvida</option>
        </select>
        <textarea id="sug-texto" rows="5" placeholder="Escreva aqui..." style="width:100%;padding:10px;border-radius:8px;border:1px solid #3a4a40;background:#121a17;color:#e8e6df;font-size:16px;resize:vertical;box-sizing:border-box;"></textarea>
        <div id="sug-msg" style="font-size:12px;min-height:18px;margin:6px 0;"></div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="sug-cancelar" style="padding:9px 14px;border-radius:8px;border:1px solid #3a4a40;background:transparent;color:#e8e6df;cursor:pointer;">Fechar</button>
          <button id="sug-enviar" style="padding:9px 16px;border-radius:8px;border:none;background:#c7973f;color:#1a1408;font-weight:700;cursor:pointer;">Enviar</button>
        </div>
      </div>`;
    document.body.appendChild(f);
    const fechar = () => f.remove();
    f.addEventListener('click', (e) => { if (e.target === f) fechar(); });
    document.getElementById('sug-cancelar').onclick = fechar;
    document.getElementById('sug-enviar').onclick = async () => {
      const texto = document.getElementById('sug-texto').value.trim();
      const msg = document.getElementById('sug-msg');
      if (texto.length < 3) { msg.textContent = 'Escreva a sua mensagem.'; return; }
      try {
        const r = await fetch('/api/sugestoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
          body: JSON.stringify({ tipo: document.getElementById('sug-tipo').value, texto, pagina: location.pathname })
        });
        if (!r.ok) throw new Error((await r.json()).error || 'Erro');
        msg.style.color = '#7fd18b'; msg.textContent = '✅ Enviado! Obrigado.';
        setTimeout(fechar, 1200);
      } catch (e) { msg.style.color = '#ff8a80'; msg.textContent = '❌ ' + e.message; }
    };
  }
})();
