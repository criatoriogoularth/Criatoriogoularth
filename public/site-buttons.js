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

    // ---- Visibilidade e ordem das abas do menu ----
    const vis = personalizacao.visibilidade || {};
    const navContainer = document.querySelector('.nav-links');
    const links = document.querySelectorAll('.nav-links > a, .nav-links > .dropdown');
    if (navContainer && links.length > 0) {
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

        // Pega só o texto do link direto (ex: "Plantel"), nunca o do
        // submenu de espécies dentro do dropdown — usar textContent do
        // wrapper inteiro pegaria também os nomes das espécies já
        // carregadas ali dentro, e o texto não bateria mais com o mapa.
        function textoDoItem(el) {
            const link = el.tagName === 'A' ? el : el.querySelector(':scope > a');
            return link ? link.textContent.trim() : '';
        }

        // mapa reverso (chave -> elemento) — usado tanto pra visibilidade
        // quanto pra reordenar os itens do menu
        const elementoPorChave = {};
        links.forEach(el => {
            const chave = mapa[textoDoItem(el)];
            if (chave) elementoPorChave[chave] = el;

            if (chave && vis[chave] === false) {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        });

        // Reordena os itens do menu conforme site_personalizacao.ordemMenu
        // (definido em site-editor-personalizacao.html, aba "Abas do Menu").
        // appendChild em um elemento já existente no DOM apenas o move —
        // fazendo isso em sequência, na ordem desejada, o menu inteiro fica
        // reorganizado sem precisar recriar nenhum elemento.
        if (Array.isArray(personalizacao.ordemMenu)) {
            personalizacao.ordemMenu.forEach(chave => {
                const el = elementoPorChave[chave];
                if (el) navContainer.appendChild(el);
            });
        }
    }
})();
