// sidebar.js — MIGRADO PARA API (usa db-api.js / DB.getConfig)
async function renderSidebar(activePage) {
    let personalizacao = {};
    try {
        personalizacao = (await DB.getConfig('site_personalizacao')) || {};
    } catch (e) {}

    const nome = personalizacao.nome || 'Criatório Goularth';
    const subtitulo = personalizacao.subtitulo || 'Plano Anual · Ativo';
    const iniciais = personalizacao.logoIniciais || 'CG';
    const logoUrl = personalizacao.logoUrl || '';
    const logoTamanho = personalizacao.logoTamanho || 38;

    let logoHtml = logoUrl
        ? `<img src="${logoUrl}" style="width:${logoTamanho}px;height:${logoTamanho}px;border-radius:50%;border:2px solid var(--brass);object-fit:cover;">`
        : `<div class="brand-mark">${iniciais}</div>`;

    const isSitePage = activePage && activePage.startsWith('site-');

    const systemLinks = [
        { group: 'Visão geral', items: [
            { id: 'dashboard', href: 'dashboard.html', icon: '🏠', label: 'Painel' },
            { id: 'arvore', href: 'arvore.html', icon: '🌳', label: 'Árvore Genealógica' },
        ] },
        { group: 'Plantel', items: [
            { id: 'passaros', href: 'passaros.html', icon: '🐦', label: 'Pássaros' },
            { id: 'cadastro-ave', href: 'cadastro-ave.html', icon: '📋', label: 'Cadastro de Ave' },
            { id: 'anilhas', href: 'anilhas.html', icon: '🏷️', label: 'Anilhas' },
            { id: 'reproducao', href: 'reproducao.html', icon: '🥚', label: 'Reprodução' },
            { id: 'crachas', href: 'crachas.html', icon: '🏷️', label: 'Crachás' },
            { id: 'importar-arvore', href: 'importar-arvore.html', icon: '📤', label: 'Importar Árvore' },
        ] },
        { group: 'Criatório', items: [
            { id: 'cadastro-criador', href: 'cadastro-criador.html', icon: '🏷️', label: 'Dados do Criatório' },
            { id: 'admin-site', href: 'admin-site.html', icon: '🌐', label: 'Site do Criatório' },
            { id: 'admin-db', href: 'admin-db.html', icon: '🗄️', label: 'Backup & Dados' },
        ] },
    ];

    const siteLinks = [
        { group: 'Site', items: [
            { id: 'site-home', href: 'site-home.html', icon: '🏠', label: 'Home' },
            { id: 'site-criatorio', href: 'site-criatorio.html', icon: '🏷️', label: 'O Criatório' },
            { id: 'site-noticias', href: 'site-noticias.html', icon: '📰', label: 'Notícias' },
            { id: 'site-plantel', href: 'site-plantel.html', icon: '🐦', label: 'Plantel' },
            { id: 'site-adultos', href: 'site-adultos.html', icon: '🐤', label: 'Adultos' },
            { id: 'site-filhotes', href: 'site-filhotes.html', icon: '🐣', label: 'Filhotes' },
            { id: 'site-fotos', href: 'site-fotos.html', icon: '📸', label: 'Fotos' },
            { id: 'site-videos', href: 'site-videos.html', icon: '🎬', label: 'Vídeos' },
            { id: 'site-contato', href: 'site-contato.html', icon: '📧', label: 'Contato' },
        ] },
    ];

    let groupsHtml = '';
    const listaAtiva = isSitePage ? siteLinks : systemLinks;
    listaAtiva.forEach(g => {
        groupsHtml += `<div><div class="group-label">${g.group}</div>`;
        g.items.forEach(it => {
            const isActive = it.id === activePage ? ' active' : '';
            groupsHtml += `<a class="navlink${isActive}" href="${it.href}">${it.icon} ${it.label}</a>`;
        });
        groupsHtml += `</div>`;
    });

    const temaAtual = personalizacao.tema || 'escuro';

    const usuarioStr = localStorage.getItem('usuario');
    const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;

    let footerHtml = `
        <div class="plan-chip" style="flex-direction:column;align-items:stretch;gap:4px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span>👑 ${usuario ? usuario.nome : 'Administrador'}</span>
                <span style="font-size:10px;color:var(--text-muted);">${usuario ? (usuario.criatorio || '') : 'Criatório Goularth'}</span>
            </div>
            <div style="font-size:10px;color:var(--text-muted);text-align:center;">🔑 Acesso total ao sistema</div>
        </div>
        <div style="margin-top:8px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
            <button onclick="setTheme('escuro')"
                style="background:${temaAtual === 'escuro' ? 'rgba(199,151,63,0.2)' : 'transparent'};
                       border:1px solid ${temaAtual === 'escuro' ? 'var(--brass)' : 'var(--line)'};
                       border-radius:6px;padding:4px 10px;
                       color:${temaAtual === 'escuro' ? 'var(--brass-soft)' : 'var(--text-muted)'};
                       cursor:pointer;font-size:10px;transition:.15s ease;">🌙</button>
            <button onclick="setTheme('claro')"
                style="background:${temaAtual === 'claro' ? 'rgba(199,151,63,0.2)' : 'transparent'};
                       border:1px solid ${temaAtual === 'claro' ? 'var(--brass)' : 'var(--line)'};
                       border-radius:6px;padding:4px 10px;
                       color:${temaAtual === 'claro' ? 'var(--brass-soft)' : 'var(--text-muted)'};
                       cursor:pointer;font-size:10px;transition:.15s ease;">☀️</button>
            <button onclick="fazerLogout()"
                style="background:transparent;border:1px solid var(--danger);border-radius:6px;padding:4px 10px;
                       color:#e2988a;cursor:pointer;font-size:10px;transition:.15s ease;">🚪 Sair</button>
        </div>
    `;

    const html = `
        <div class="brand">
            ${logoHtml}
            <div class="brand-text">
                <div class="name">${nome}</div>
                <div class="sub">${subtitulo}</div>
            </div>
        </div>
        <nav class="groups">${groupsHtml}</nav>
        <div class="sidebar-foot">${footerHtml}</div>
    `;

    const sidebarEl = document.getElementById('sidebar');
    if (sidebarEl) {
        sidebarEl.innerHTML = html;
    }
}

async function setTheme(tema) {
    const root = document.documentElement;
    const personalizacao = (await DB.getConfig('site_personalizacao')) || {};
    personalizacao.tema = tema;
    await DB.setConfig('site_personalizacao', personalizacao);

    if (tema === 'claro') {
        root.style.setProperty('--bg', '#f5f0e8');
        root.style.setProperty('--bg-elevated', '#ede8df');
        root.style.setProperty('--bg-elevated-2', '#e5dfd4');
        root.style.setProperty('--text', '#23291f');
        root.style.setProperty('--text-muted', '#5a6355');
        root.style.setProperty('--line', 'rgba(199,151,63,0.3)');
    } else {
        root.style.setProperty('--bg', '#0d1a16');
        root.style.setProperty('--bg-elevated', '#132621');
        root.style.setProperty('--bg-elevated-2', '#17302a');
        root.style.setProperty('--text', '#ece6d6');
        root.style.setProperty('--text-muted', '#9aa89e');
        root.style.setProperty('--line', 'rgba(199,151,63,0.22)');
    }

    const path = window.location.pathname.split('/').pop();
    const activePage = path.replace('.html', '');
    renderSidebar(activePage);
}

function fazerLogout() {
    if (confirm('Deseja realmente sair do sistema?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

console.log('✅ sidebar.js (API) carregado');
