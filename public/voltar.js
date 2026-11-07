// voltar.js — "Voltar" que realmente volta para a tela de ONDE A PESSOA VEIO.
//
// Antes, cada botão "Voltar" era um link fixo (quase sempre para a Home ou para
// a lista), então não importava de onde você veio: sempre caía no mesmo lugar.
// Agora:
//   voltar('site-plantel.html')
//     - se existe uma tela anterior do próprio site -> volta para ela (history.back)
//     - se a página foi aberta direto (link salvo, WhatsApp, nova aba) -> vai para
//       o endereço de reserva informado, para o botão nunca ficar "morto".
(function () {
  function mesmoSite(ref) {
    try { return new URL(ref).origin === location.origin; } catch (e) { return false; }
  }

  window.voltar = function (reserva) {
    var ref = document.referrer || '';
    var veioDoSite = ref && mesmoSite(ref) && !/login\.html/i.test(ref);
    if (veioDoSite && history.length > 1) {
      history.back();
    } else {
      location.href = reserva || 'site-home.html';
    }
    return false; // usado em onclick="return voltar(...)" para cancelar o link
  };

  // Ao voltar com o botão do navegador/celular a página pode vir do cache já
  // "congelada" (lista velha). Recarrega para mostrar o que está atual.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) location.reload();
  });
})();
