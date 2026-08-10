// site-buttons.js - CONFIGURA BOTÕES E MENU DE TODAS AS PÁGINAS DO SITE (via API)
//
// CORREÇÃO: a lógica de esconder/mostrar abas do menu (site_personalizacao.visibilidade)
// antes vivia duplicada dentro de cada página (site-home, site-criatorio, site-fotos,
// site-videos), e as outras páginas (site-adultos, site-contato, site-filhotes,
// site-noticias, site-plantel, site-certificado) nunca tinham essa lógica — por isso uma
// aba escondida em uma página voltava a aparecer em qualquer outra. Como este arquivo é
// incluído em todas as páginas do site, a aplicação da visibilidade foi centralizada
// aqui: agora funciona igual em todas as páginas, e existe um só lugar pra manter.
//
// Também aplica aqui o tema (cores e fonte) escolhido em site-editor-tema.html —
// como style-site.css usa var(--bg), var(--brass), var(--font-titulo) etc, é só
// injetar um <style> pequeno no <head> sobrescrevendo essas variáveis.
//
// MUDANÇA: "Copas" deixou de ser uma aba/página própria no menu. Os links de
// Copas e Torneios agora aparecem como um widget na coluna lateral de Home e
// Criatório (mesmo estilo do menu lateral de blog: legenda + lista de links,
// sem caixa), junto dos banners de anúncio. Por isso, em toda página do site,
// qualquer link apontando pra "site-torneios.html" (o antigo menu/aba Copas)
// é removido automaticamente daqui — não precisa mexer em cada página do site
// uma por uma.

// Pares de fonte disponíveis no editor de tema. Cada um carrega seu próprio
// Google Fonts só quando é o escolhido — a fonte padrão (Fraunces + Manrope)
// já vem no <link> fixo de cada página, então não precisa recarregar nada.
const FONTES_DISPONIVEIS = {
  padrao: {
    titulo: "'Fraunces', serif",
    texto: "'Manrope', sans-serif",
    googleFontsUrl: null
  },
  elegante: {
    titulo: "'Playfair Display', serif",
    texto: "'Lato', sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Lato:wght@400;500;600;700&display=swap'
  },
  moderno: {
    titulo: "'Poppins', sans-serif",
    texto: "'Inter', sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap'
  }
};
window.FONTES_DISPONIVEIS = FONTES_DISPONIVEIS;

function aplicarTemaPersonalizado(personalizacao) {
  const cores = personalizacao.temaCores;
  const fonteChave = personalizacao.temaFonte || 'padrao';
  const fonte = FONTES_DISPONIVEIS[fonteChave] || FONTES_DISPONIVEIS.padrao;

  if (fonte.googleFontsUrl && !document.querySelector(`link[href="${fonte.googleFontsUrl}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fonte.googleFontsUrl;
    document.head.appendChild(link);
  }

  const linhas = [`--font-titulo: ${fonte.titulo};`, `--font-texto: ${fonte.texto};`];

  if (cores) {
    if (cores.bg) linhas.push(`--bg: ${cores.bg};`);
    if (cores.bgElevated) linhas.push(`--bg-elevated: ${cores.bgElevated};`);
    if (cores.bgElevated2) linhas.push(`--bg-elevated-2: ${cores.bgElevated2};`);
    if (cores.brass) linhas.push(`--brass: ${cores.brass};`);
    if (cores.brassSoft) linhas.push(`--brass-soft: ${cores.brassSoft};`);
    if (cores.brassDim) linhas.push(`--brass-dim: ${cores.brassDim};`);
    if (cores.line) linhas.push(`--line: ${cores.line};`);
    if (cores.text) linhas.push(`--text: ${cores.text};`);
    if (cores.textMuted) linhas.push(`--text-muted: ${cores.textMuted};`);
    if (cores.sageSoft) linhas.push(`--sage-soft: ${cores.sageSoft};`);
  }

  let styleTag = document.getElementById('tema-personalizado');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'tema-personalizado';
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = `:root {\n  ${linhas.join('\n  ')}\n}`;
}

(async function () {
    async function getConfig(chave) {
        try {
            return (window.DB ? await DB.getConfig(chave) : null) || {};
        } catch (e) {
            return {};
        }
    }

    // ---- Remove a antiga aba/página "Copas" do menu e do rodapé ----
    // Os links de Copas e Torneios agora vivem só como widget na coluna
    // lateral de Home/Criatório (ver seção mais abaixo). Roda em toda
    // página do site porque este arquivo é incluído em todas elas.
    document.querySelectorAll('a[href="site-torneios.html"]').forEach(el => el.remove());

    const [conteudo, personalizacao] = await Promise.all([
        getConfig('site_conteudo'),
        getConfig('site_personalizacao')
    ]);

    aplicarTemaPersonalizado(personalizacao);

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

    // ---- Visibilidade e ordem das abas do menu (topo) E do rodapé ----
    //
    // CORREÇÃO (bug do rodapé): antes só o menu de topo (.nav-links) era
    // filtrado por site_personalizacao.visibilidade/ordemMenu — o rodapé
    // (.site-footer .links) nunca era tocado, por isso sempre mostrava
    // todas as abas, mesmo as escondidas. Como o mapa de nomes e a ordem
    // são os mesmos, a mesma função é aplicada nos dois containers agora.
    const vis = personalizacao.visibilidade || {};

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

    // Aplica visibilidade + ordem num container de links (menu de topo
    // OU rodapé). appendChild em um elemento já existente no DOM apenas
    // o move — fazendo isso em sequência, na ordem desejada, o container
    // inteiro fica reorganizado sem precisar recriar nenhum elemento.
    function aplicarVisibilidadeEOrdem(container, itens) {
        if (!container || itens.length === 0) return;

        const elementoPorChave = {};
        itens.forEach(el => {
            const chave = mapa[textoDoItem(el)];
            if (chave) elementoPorChave[chave] = el;

            if (chave && vis[chave] === false) {
                el.style.display = 'none';
            } else {
                el.style.display = '';
            }
        });

        if (Array.isArray(personalizacao.ordemMenu)) {
            personalizacao.ordemMenu.forEach(chave => {
                const el = elementoPorChave[chave];
                if (el) container.appendChild(el);
            });
        }
    }

    const navContainer = document.querySelector('.nav-links');
    aplicarVisibilidadeEOrdem(
        navContainer,
        navContainer ? Array.from(navContainer.querySelectorAll(':scope > a, :scope > .dropdown')) : []
    );

    const footerContainer = document.querySelector('.site-footer .links');
    aplicarVisibilidadeEOrdem(
        footerContainer,
        footerContainer ? Array.from(footerContainer.querySelectorAll(':scope > a')) : []
    );

    // ---- Revela o menu e o rodapé ----
    // CORREÇÃO (bug do "pisca"): style-site.css agora esconde .nav-links e
    // .site-footer .links por padrão (visibility:hidden) assim que a página
    // carrega, pra ninguém ver TODAS as abas por um instante antes deste
    // script terminar de buscar site_personalizacao (chamada de rede,
    // pode demorar) e aplicar a filtragem acima. Só depois de aplicar é
    // que eles voltam a ficar visíveis — já com o resultado final certo.
    if (navContainer) navContainer.style.visibility = 'visible';
    if (footerContainer) footerContainer.style.visibility = 'visible';

    // ---- Layout do menu: topo (padrão) ou lateral ----
    if ((personalizacao.layoutMenu || 'topo') === 'lateral') {
        document.body.classList.add('layout-lateral');
    }

    // ---- Coluna lateral: links de Copas/Torneios + banners de anúncio ----
    // (só Home e Criatório — são as únicas páginas do site sem fotos/tabelas
    // próprias, por isso servem de espaço pra essa coluna, nos dois modos
    // de menu).
    //
    // MUDANÇA: antes essa coluna só tinha banners de anúncio. Agora também
    // recebe, no topo, os links de Copas e Torneios — no mesmo estilo de
    // "menu lateral de blog" (legenda da categoria + lista de links, sem
    // caixa), que é como o usuário já publicava isso no site antigo.
    const PAGINAS_COM_BANNER = ['site-home', 'site-criatorio'];
    const paginaAtual = (location.pathname.split('/').pop() || '').replace('.html', '');
    if (PAGINAS_COM_BANNER.includes(paginaAtual)) {
        const [banners, torneios] = await Promise.all([
            getConfig('site_banners'),
            (async () => {
                try {
                    return (window.DB && DB.getTorneiosPublico) ? await DB.getTorneiosPublico() : [];
                } catch (e) {
                    return [];
                }
            })()
        ]);

        const ativos = Array.isArray(banners) ? banners.filter(b => b && b.imagemUrl) : [];

        // Agrupa os links por categoria, mantendo a ordem que já vem da
        // API pública (categoria, ordem, data) — mesma lógica usada antes
        // na página site-torneios.html.
        const gruposTorneios = {};
        (Array.isArray(torneios) ? torneios : []).forEach(t => {
            const cat = t.categoria || 'Torneios';
            if (!gruposTorneios[cat]) gruposTorneios[cat] = [];
            gruposTorneios[cat].push(t);
        });
        const temTorneios = Object.keys(gruposTorneios).length > 0;

        const siteMain = document.querySelector('.site-main');

        if ((ativos.length > 0 || temTorneios) && siteMain) {
            // Move todo o conteúdo que já existia pra dentro de um wrapper,
            // sobrando só ele + a coluna lateral como filhos diretos de
            // .site-main — assim o grid de 2 colunas (conteúdo | lateral)
            // funciona sem precisar saber o que tem dentro da página.
            const conteudoWrapper = document.createElement('div');
            conteudoWrapper.className = 'site-main-conteudo';
            while (siteMain.firstChild) {
                conteudoWrapper.appendChild(siteMain.firstChild);
            }

            const coluna = document.createElement('aside');
            coluna.className = 'site-banner-coluna';

            let html = '';

            if (temTorneios) {
                html += Object.entries(gruposTorneios).map(([categoria, lista]) => `
                    <div class="site-torneios-widget">
                        <h4>${categoria}</h4>
                        <ul>
                            ${lista.map(t => `<li><a href="site-torneio-detalhe.html?id=${t.id}">${t.etapa}</a></li>`).join('')}
                        </ul>
                    </div>
                `).join('');
            }

            html += ativos.map(b => {
                const abre = b.link
                    ? `<a class="banner-anuncio" href="${b.link}" target="_blank" rel="noopener sponsored">`
                    : `<div class="banner-anuncio">`;
                const fecha = b.link ? '</a>' : '</div>';
                return `${abre}<img src="${b.imagemUrl}" alt="Anúncio" loading="lazy">${fecha}`;
            }).join('');

            coluna.innerHTML = html;

            siteMain.appendChild(conteudoWrapper);
            siteMain.appendChild(coluna);
            siteMain.classList.add('tem-banner');
        }
    }

    // ---- Contador de visitantes ----
    // Registra só 1x por sessão do navegador (sessionStorage some quando
    // a aba/janela fecha) — assim "visita" conta pessoas, não cada
    // página que a mesma pessoa navega dentro do site.
    if (!sessionStorage.getItem('visita_registrada') && window.DB && DB.registrarVisita) {
        sessionStorage.setItem('visita_registrada', '1');
        DB.registrarVisita(paginaAtual);
    }
})();
