const { ValidationError } = require('../errors/AppError');

// Aceita o formato antigo (ABC1234) e o Mercosul (ABC1D23).
const PLACA_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

/** Garante que o valor é uma string não vazia e devolve-a sem espaços nas pontas. */
function requireNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`O campo "${fieldName}" é obrigatório e deve ser um texto não vazio.`);
  }
  return value.trim();
}

/** Normaliza (maiúsculas, sem hífen/espaços) e valida uma placa de automóvel. */
function parsePlaca(value) {
  const placa = requireNonEmptyString(value, 'placa').replace(/[\s-]/g, '').toUpperCase();
  if (!PLACA_REGEX.test(placa)) {
    throw new ValidationError('A placa informada é inválida. Use o formato ABC1234 ou ABC1D23.');
  }
  return placa;
}

/** Converte um valor em `Date`, lançando erro de validação se for inválido. */
function parseDate(value, fieldName) {
  const date = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(date.getTime())) {
    throw new ValidationError(`O campo "${fieldName}" deve ser uma data válida no formato ISO 8601.`);
  }
  return date;
}

/** Comparação de textos sem diferenciar maiúsculas/minúsculas e acentos. */
function normalizeText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

module.exports = { requireNonEmptyString, parsePlaca, parseDate, normalizeText };
