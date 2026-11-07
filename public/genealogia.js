/* genealogia.js — ÚNICA fonte da árvore genealógica (5 gerações) de todo o sistema.
 *
 * Funciona no navegador (window.Genealogia) e no Node (require).
 * Todas as telas (árvore do admin, certificado do site, crachá, simulador,
 * herança do filhote na reprodução e no cadastro) usam estas funções, para a
 * árvore ser SEMPRE a mesma, em qualquer lugar.
 *
 * Caminhos: '' = a ave; 'pai', 'mae' = pais (geração 1); 'pai.mae' = avó paterna (2) ...
 * 'mae.pai.mae.pai.mae' = geração 5 (tetravós).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Genealogia = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_GER = 5;
  const NOME_GERACAO = { 1: 'Pais', 2: 'Avós', 3: 'Bisavós', 4: 'Trisavós', 5: 'Tataravós' };

  const vazio = (s) => {
    const t = String(s == null ? '' : s).trim();
    return t === '' || t === '-' || t === '—';
  };
  const limpa = (s) => (vazio(s) ? '' : String(s).trim());
  const norm = (s) => limpa(s).toLowerCase().replace(/\s+/g, ' ');
  const geracaoDe = (caminho) => (caminho === '' ? 0 : caminho.split('.').length);
  const sexoDe = (caminho) => (caminho.endsWith('pai') ? 'M' : 'F');
  // aceita camelCase (navegador) e snake_case (linha crua do banco)
  const pega = (o, a, b) => (o && o[a] != null ? o[a] : (o && b && o[b] != null ? o[b] : ''));

  function lerLista(v) {
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = []; } }
    return Array.isArray(v) ? v : [];
  }

  // Árvore que a ave carrega "consigo": colunas (pai, mãe, avós) + lista `ancestrais`.
  // Nos conflitos de pais/avós valem as colunas (é o que a tela de árvore edita);
  // a anilha que faltar numa é completada pela outra.
  function propria(ave) {
    const mapa = {};
    const poe = (caminho, nome, anilha, extra) => {
      const n = limpa(nome) || limpa(anilha);
      if (!n) return;
      const atual = mapa[caminho];
      if (!atual) {
        mapa[caminho] = Object.assign({ nome: n, anilha: limpa(anilha) }, extra || {});
      } else if (norm(atual.nome) === norm(n) || !limpa(atual.nome)) {
        if (!atual.anilha && limpa(anilha)) atual.anilha = limpa(anilha);
        if (extra) Object.keys(extra).forEach((k) => { if (!atual[k] && extra[k]) atual[k] = extra[k]; });
      }
      // nomes diferentes: mantém o que já estava (colunas entram primeiro)
    };
    poe('pai', ave.pai, pega(ave, 'anilhaPai', 'anilha_pai'));
    poe('mae', ave.mae, pega(ave, 'anilhaMae', 'anilha_mae'));
    poe('pai.pai', pega(ave, 'avoPaterno', 'avo_paterno'), pega(ave, 'anilhaAvoPaterno', 'anilha_avo_paterno'));
    poe('pai.mae', pega(ave, 'avoPaterna', 'avo_paterna'), pega(ave, 'anilhaAvoPaterna', 'anilha_avo_paterna'));
    poe('mae.pai', pega(ave, 'avoMaterno', 'avo_materno'), pega(ave, 'anilhaAvoMaterno', 'anilha_avo_materno'));
    poe('mae.mae', pega(ave, 'avoMaterna', 'avo_materna'), pega(ave, 'anilhaAvoMaterna', 'anilha_avo_materna'));
    lerLista(ave.ancestrais).forEach((a) => {
      if (!a || typeof a.caminho !== 'string' || !a.caminho) return;
      poe(a.caminho, a.nome, a.anilha, { especie: a.especie || '', raca: a.raca || '' });
    });
    return mapa;
  }

  function indexar(aves) {
    const porNome = new Map();
    const porAnilha = new Map();
    (aves || []).forEach((a) => {
      const n = norm(a.nome);
      const an = norm(a.anilha);
      if (n) { if (!porNome.has(n)) porNome.set(n, []); porNome.get(n).push(a); }
      if (an) { if (!porAnilha.has(an)) porAnilha.set(an, []); porAnilha.get(an).push(a); }
    });
    return { porNome, porAnilha };
  }

  // Acha a ave cadastrada que corresponde a um nó. Sem chute: se houver dúvida
  // (dois pássaros com o mesmo nome e sem anilha para desempatar), não liga.
  function achar(no, idx, excluirIds) {
    const ok = (a) => !excluirIds.has(String(a.id));
    const an = norm(no.anilha);
    const nm = norm(no.nome);
    if (an && idx.porAnilha.has(an)) {
      const c = idx.porAnilha.get(an).filter(ok);
      const igualNome = c.filter((a) => norm(a.nome) === nm);
      if (igualNome.length === 1) return igualNome[0];
      if (c.length === 1) return c[0];
    }
    if (nm && idx.porNome.has(nm)) {
      const c = idx.porNome.get(nm).filter(ok);
      if (c.length === 1) return c[0];
      if (c.length > 1 && an) {
        const e = c.filter((a) => norm(a.anilha) === an);
        if (e.length === 1) return e[0];
      }
    }
    return null;
  }

  /**
   * Monta a árvore completa de uma ave, subindo pelos pais cadastrados.
   * @param ave        a ave (objeto com pai, mae, avoPaterno..., ancestrais)
   * @param todasAves  todas as aves do criatório (para seguir pai/mãe cadastrados)
   * @param opcoes     { maxGen = 5, ancestraisTabela = [] }  (tabela "ancestrais": completa anilhas)
   * @returns { caminho: { nome, anilha, sexo } }  (inclui '' = a própria ave)
   */
  function montar(ave, todasAves, opcoes) {
    const opt = opcoes || {};
    const maxGen = Math.min(opt.maxGen || MAX_GER, MAX_GER);
    const idx = indexar(todasAves);
    const cache = new Map();
    const propriaDe = (a) => {
      const k = String(a.id);
      if (!cache.has(k)) cache.set(k, propria(a));
      return cache.get(k);
    };

    const arvore = {};
    arvore[''] = { nome: limpa(ave.nome), anilha: limpa(ave.anilha), sexo: ave.sexo || '' };
    const ligada = {}; // caminho -> id da ave cadastrada que esse nó representa

    const base = propria(ave);
    Object.keys(base).forEach((c) => {
      if (geracaoDe(c) <= maxGen) arvore[c] = Object.assign({}, base[c], { sexo: sexoDe(c) });
    });

    // idsNoCaminho: evita ciclos (ave que apareceria como ancestral dela mesma)
    const idsAcima = (caminho) => {
      const ids = new Set([String(ave.id)]);
      const partes = caminho ? caminho.split('.') : [];
      for (let i = 1; i < partes.length; i++) {
        const pref = partes.slice(0, i).join('.');
        if (ligada[pref] != null) ids.add(String(ligada[pref]));
      }
      return ids;
    };

    for (let g = 1; g <= maxGen; g++) {
      Object.keys(arvore).filter((c) => geracaoDe(c) === g).forEach((c) => {
        const no = arvore[c];
        const b = achar(no, idx, idsAcima(c));
        if (!b) return;
        ligada[c] = b.id;
        if (!no.anilha && limpa(b.anilha)) no.anilha = limpa(b.anilha);
        if (g >= maxGen) return;
        const sub = propriaDe(b);
        Object.keys(sub).forEach((s) => {
          const cc = c + '.' + s;
          if (geracaoDe(cc) > maxGen) return;
          if (!arvore[cc]) arvore[cc] = Object.assign({}, sub[s], { sexo: sexoDe(cc) });
          else if (norm(arvore[cc].nome) === norm(sub[s].nome) && !arvore[cc].anilha && sub[s].anilha) {
            arvore[cc].anilha = sub[s].anilha;
          }
        });
      });
    }

    // anilha que ainda faltar: tenta pela tabela "ancestrais" (nome único)
    const tab = indexar(opt.ancestraisTabela || []);
    Object.keys(arvore).forEach((c) => {
      const no = arvore[c];
      if (c === '' || no.anilha || !norm(no.nome)) return;
      const cand = tab.porNome.get(norm(no.nome));
      if (cand && cand.length === 1 && limpa(cand[0].anilha)) no.anilha = limpa(cand[0].anilha);
    });
    return arvore;
  }

  // Lista plana para gravar/enviar: [{ geracao, nomeGeracao, caminho, sexo, nome, anilha, especie, raca, nota }]
  function listar(arvore, geracaoMinima) {
    const min = geracaoMinima == null ? 1 : geracaoMinima;
    return Object.keys(arvore)
      .filter((c) => c !== '' && geracaoDe(c) >= min && limpa(arvore[c].nome))
      .sort((a, b) => geracaoDe(a) - geracaoDe(b) || a.localeCompare(b))
      .map((c) => ({
        geracao: geracaoDe(c),
        nomeGeracao: NOME_GERACAO[geracaoDe(c)] || ('G' + geracaoDe(c)),
        caminho: c,
        sexo: sexoDe(c),
        nome: arvore[c].nome,
        anilha: arvore[c].anilha || '',
        especie: arvore[c].especie || '',
        raca: arvore[c].raca || '',
        nota: ''
      }));
  }

  // Quantas posições da árvore (de 62 possíveis nas 5 gerações) estão preenchidas
  function contar(arvore) {
    return Object.keys(arvore).filter((c) => c !== '' && limpa(arvore[c].nome)).length;
  }

  return { MAX_GER, NOME_GERACAO, montar, listar, contar, propria, geracaoDe, sexoDe, norm, limpa };
});
