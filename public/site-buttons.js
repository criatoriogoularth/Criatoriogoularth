// site-buttons.js - CONFIGURA BOTÕES E MENU DE TODAS AS PÁGINAS DO SITE (via API)
//
// CORREÇÃO: a lógica de esconder/mostrar abas do menu (site_personalizacao.visibilidade)
// antes vivia duplicada dentro de cada página (site-home, site-criatorio, site-fotos,
// site-videos), e as outras páginas (site-adultos, site-contato, site-filhotes,
// site-noticias, site-plantel, site-certificado) nunca tinham essa lógica — por isso uma
// aba escondida em uma página voltava a aparecer em qualquer outra. Como este arquivo é
// incluído em todas as páginas do site, a aplicação da visibilidade foi centralizada
// aqui: agora funciona igual em todas as páginas, e existe um só lugar pra manter.
(async function () {
    async function getConfig(chave) {
        try {
            return (window.DB ? await DB.getConfig(chave) : null) || {};
        } catch (e) {
            return {};
        }
    }

    const [conteudo, personalizacao] = await Promise.all([
        getConfig('site_conteudo'),
        getConfig('site_personalizacao')
    ]);

    // ---- Botões de WhatsApp ----
    const whatsappBtns = document.querySelectorAll('.btn-whatsapp, .btn-whatsapp-site, a[href*="wa.me"], a[href*="whatsapp"]');
    whatsappBtns.forEach(btn => {
        if (conteudo.whatsapp) {
            const numero = conteudo.whatsapp.replace(/\D/g, '');
            btn.href = `https://wa.me/${numero}`;
            btn.target = '_blank';
        } else {
            btn.href = 'https://wa.me/5511941493657';
            btn.target = '_blank';
        }
    });

    // ---- Botão de login ----
    const loginBtns = document.querySelectorAll('.btn-login-site, a[href*="login"]');
    loginBtns.forEach(btn => {
        if (btn.textContent.includes('Entrar') || btn.textContent.includes('🔐')) {
            btn.href = 'login.html';
        }
    });

    // ---- Visibilidade das abas do menu ----
    const vis = personalizacao.visibilidade || {};
    const links = document.querySelectorAll('.nav-links > a, .nav-links > .dropdown');
    if (links.length > 0) {
        const mapa = {
            'Home': 'home',
            'O Criatório': 'criatorio',
            'Notícias': 'noticias',
            'Plantel': 'plantel',
            'Adultos': 'adultos',
            'Filhotes': 'filhotes',
            'Fotos': 'fotos',
            'Vídeos': 'videos',
            'Crachás': 'crachas',
            'Contato': 'contato'
        };

        links.forEach(el => {
            const texto = el.textContent.trim();
            const chave = mapa[texto];
            if (chave && vis[chave] === false) {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        });
    }
})();
