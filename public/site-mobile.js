/* site-mobile.js — ajudas só para o celular (não altera nada no computador).
   1) Escreve o nome da coluna (data-label) dentro de cada célula das tabelas,
      para o CSS poder mostrar "Anilha: ...", "Nascimento: ..." em cada cartão.
      As tabelas são montadas depois que a página carrega, então ele acompanha.
   2) Trava a rolagem da página enquanto o menu está aberto e fecha o menu ao
      tocar num link ou ao voltar para a tela larga.                         */
(function () {
  'use strict';

  function rotular(tabela) {
    var ths = tabela.querySelectorAll('thead th');
    if (!ths.length) return;
    var nomes = Array.prototype.map.call(ths, function (th) { return (th.textContent || '').trim(); });
    tabela.querySelectorAll('tbody tr').forEach(function (tr) {
      Array.prototype.forEach.call(tr.children, function (td, i) {
        if (td.tagName === 'TD' && !td.hasAttribute('data-label') && nomes[i]) {
          td.setAttribute('data-label', nomes[i]);
        }
      });
    });
  }
  function rotularTudo() {
    document.querySelectorAll('.table-wrapper table, table').forEach(rotular);
  }

  var agendado = false;
  function agendar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(function () { agendado = false; rotularTudo(); });
  }

  function iniciar() {
    rotularTudo();
    new MutationObserver(agendar).observe(document.body, { childList: true, subtree: true });

    var nav = document.querySelector('.site-nav');
    if (!nav) return;

    new MutationObserver(function () {
      document.body.classList.toggle('menu-aberto', nav.classList.contains('aberto'));
    }).observe(nav, { attributes: true, attributeFilter: ['class'] });

    function fechar() {
      if (!nav.classList.contains('aberto')) return;
      nav.classList.remove('aberto');
      var b = nav.querySelector('.nav-toggle');
      if (b) { b.setAttribute('aria-expanded', 'false'); b.innerHTML = '☰ Menu'; }
    }
    // tocar num link que leva a outra página fecha o menu (o submenu "Plantel" abre no 1º toque)
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (a && !a.parentElement.classList.contains('dropdown') && !a.parentElement.classList.contains('sub-dropdown')) fechar();
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 768) fechar(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
