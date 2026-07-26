// auth-client.js — SUBSTITUI o antigo auth-check.js
//
// Antes, "estar logado" era só uma flag no localStorage que qualquer um
// podia setar pelo console. Agora, a verificação de verdade acontece no
// servidor: este arquivo só confirma se existe um token e, em caso de
// dúvida, pergunta pra API se ele ainda é válido (GET /api/auth/me).
(function () {
  const page = window.location.pathname.split('/').pop() || 'index.html';

  const paginasPublicas = [
    'index.html', 'login.html',
    'site-home.html', 'site-criatorio.html', 'site-noticias.html',
    'site-plantel.html', 'site-adultos.html', 'site-filhotes.html',
    'site-fotos.html', 'site-videos.html', 'site-contato.html',
    'site-certificado.html'
  ];

  if (paginasPublicas.includes(page) || page.startsWith('site-')) {
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Valida o token no servidor (assíncrono — não bloqueia o render,
  // mas redireciona se o token estiver mesmo inválido/expirado)
  fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    .then(res => {
      if (!res.ok) throw new Error('Token inválido');
      return res.json();
    })
    .then(usuario => {
      window.USUARIO_LOGADO = usuario;
      window.USUARIO_EH_ADMIN = usuario.role === 'admin';
    })
    .catch(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = 'login.html';
    });
})();
