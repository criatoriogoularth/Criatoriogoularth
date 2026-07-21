// site-buttons.js - CONFIGURA BOTÕES DE TODAS AS PÁGINAS DO SITE (via API)
(async function () {
    function getContato() {
        try {
            return (window.DB ? DB.getConfig('site_conteudo') : Promise.resolve({}));
        } catch (e) { return {}; }
    }

    const contato = (await getContato()) || {};
    const whatsappBtns = document.querySelectorAll('.btn-whatsapp, .btn-whatsapp-site, a[href*="wa.me"], a[href*="whatsapp"]');

    whatsappBtns.forEach(btn => {
        if (contato.whatsapp) {
            const numero = contato.whatsapp.replace(/\D/g, '');
            btn.href = `https://wa.me/${numero}`;
            btn.target = '_blank';
        } else {
            btn.href = 'https://wa.me/5511941493657';
            btn.target = '_blank';
        }
    });

    const loginBtns = document.querySelectorAll('.btn-login-site, a[href*="login"]');
    loginBtns.forEach(btn => {
        if (btn.textContent.includes('Entrar') || btn.textContent.includes('🔐')) {
            btn.href = 'login.html';
        }
    });
})();
