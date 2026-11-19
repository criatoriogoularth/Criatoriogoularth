// cert-cabecalho.js — preenche o cabeçalho do certificado/árvore com os dados do CRIATÓRIO.
// (Antes o texto era fixo, com o nome e o registro de uma pessoa só.)
// No site público só chegam os campos de contato público; CPF e endereço nunca saem do cadastro.
(function () {
  async function preencher() {
    const ids = ['cert-criador', 'cert-responsavel', 'cert-registros', 'cert-contato'];
    if (!ids.some((i) => document.getElementById(i))) return;
    let d = null, p = null;
    try { d = await DB.getConfig('dados_criatorio'); } catch (e) {}
    try { p = await DB.getConfig('site_personalizacao'); } catch (e) {}
    let u = {}; try { u = JSON.parse(localStorage.getItem('usuario') || '{}'); } catch (e) {}
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt || ''; };
    set('cert-criador', (d && d.nomeCriatorio) || (p && p.nome) || u.criatorio || '');
    set('cert-responsavel', (d && d.responsavel) ? 'Responsável: ' + d.responsavel : '');
    set('cert-registros', (d && d.registro) ? 'Registro: ' + d.registro : '');
    set('cert-contato', [d && d.email, d && (d.celular || d.whatsapp || d.fone)].filter(Boolean).join(' · '));
    const rodape = document.getElementById('cert-footer-text');
    if (rodape) rodape.textContent = 'Gestão de Criatório' + (((d && d.nomeCriatorio) || (p && p.nome)) ? ' ' + ((d && d.nomeCriatorio) || p.nome) : '');
  }
  window.preencherCabecalhoCert = preencher;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preencher); else preencher();
})();
