/**
 * Erros de domínio da aplicação.
 *
 * Cada erro carrega o status HTTP correspondente, de modo que a camada de
 * serviço apenas lança o erro semântico e o middleware de erros decide como
 * responder ao cliente.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

/** 400 - dados de entrada inválidos. */
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

/** 404 - recurso inexistente. */
class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

/** 409 - a operação viola uma regra de negócio ou conflita com o estado atual. */
class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

module.exports = { AppError, ValidationError, NotFoundError, ConflictError };
