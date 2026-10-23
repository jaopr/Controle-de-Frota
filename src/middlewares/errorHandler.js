const { AppError, NotFoundError } = require('../errors/AppError');

/** Responde 404 para qualquer rota não mapeada. */
function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Rota ${req.method} ${req.originalUrl} não encontrada.`));
}

/**
 * Converte erros em respostas JSON padronizadas: `{ "erro": "mensagem" }`.
 * Erros inesperados são registrados no console e retornam 500 sem expor detalhes.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ erro: err.message });
  }

  // JSON malformado no corpo da requisição (lançado pelo express.json()).
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'O corpo da requisição não é um JSON válido.' });
  }

  console.error(err);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = { notFoundHandler, errorHandler };
