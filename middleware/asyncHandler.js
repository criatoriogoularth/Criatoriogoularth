// middleware/asyncHandler.js
//
// Envolve uma rota async: se a Promise rejeitar (erro de query, etc.),
// chama next(err) em vez de deixar a rejeição "escapar" sem tratamento.
// Sem isso, um erro dentro de um handler `async (req, res) => {...}`
// vira um unhandledRejection e derruba o processo Node inteiro —
// foi o que aconteceu no crash de routes/aves.js.
module.exports = function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
