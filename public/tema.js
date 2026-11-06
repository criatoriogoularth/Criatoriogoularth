// tema.js — aplica o tema salvo (claro/escuro) antes da página aparecer,
// para não piscar o tema escuro quando o usuário escolheu o claro.
(function () {
  try {
    var t = localStorage.getItem('tema');
    if (t === 'claro') document.documentElement.setAttribute('data-theme', 'claro');
  } catch (e) {}
})();
