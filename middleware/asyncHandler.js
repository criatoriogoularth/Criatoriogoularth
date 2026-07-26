// middleware/asyncHandler.js
//
// Express 4 não captura automaticamente uma Promise rejeitada dentro de
// uma rota "async (req, res) => {...}". Sem isso, um erro de banco dentro
// de qualquer rota vira um "unhandledRejection" e derruba o processo
// inteiro do Node (foi o que aconteceu em produção). Este wrapper garante
// que qualquer erro caia no middleware de erro do server.js, virando uma
// resposta 500 normal em vez de tirar o site do ar.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
