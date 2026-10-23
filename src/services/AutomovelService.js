const { ConflictError, NotFoundError } = require('../errors/AppError');
const { requireNonEmptyString, parsePlaca, normalizeText } = require('../utils/validators');

/** Regras de negócio do cadastro de automóveis. */
class AutomovelService {
  /**
   * @param {InMemoryRepository} automovelRepository
   * @param {InMemoryRepository} utilizacaoRepository usado para impedir a exclusão
   *        de automóveis que possuem histórico de utilização.
   */
  constructor(automovelRepository, utilizacaoRepository) {
    this.automovelRepository = automovelRepository;
    this.utilizacaoRepository = utilizacaoRepository;
  }

  create(payload = {}) {
    const data = this.#parsePayload(payload);
    this.#assertPlacaDisponivel(data.placa);
    return this.automovelRepository.create(data);
  }

  update(id, payload = {}) {
    this.getById(id);
    const data = this.#parsePayload(payload);
    this.#assertPlacaDisponivel(data.placa, id);
    return this.automovelRepository.update(id, data);
  }

  remove(id) {
    this.getById(id);

    const possuiUtilizacoes = this.utilizacaoRepository.findAll((u) => u.automovelId === id).length > 0;
    if (possuiUtilizacoes) {
      throw new ConflictError('Não é possível excluir um automóvel que possui registros de utilização.');
    }

    this.automovelRepository.delete(id);
  }

  getById(id) {
    const automovel = this.automovelRepository.findById(id);
    if (!automovel) {
      throw new NotFoundError(`Automóvel "${id}" não encontrado.`);
    }
    return automovel;
  }

  /** Lista os automóveis, com filtros opcionais por cor e marca (sem diferenciar maiúsculas/acentos). */
  list({ cor, marca } = {}) {
    return this.automovelRepository.findAll(
      (automovel) =>
        (cor === undefined || normalizeText(automovel.cor) === normalizeText(cor)) &&
        (marca === undefined || normalizeText(automovel.marca) === normalizeText(marca)),
    );
  }

  #parsePayload({ placa, cor, marca }) {
    return {
      placa: parsePlaca(placa),
      cor: requireNonEmptyString(cor, 'cor'),
      marca: requireNonEmptyString(marca, 'marca'),
    };
  }

  /** A placa identifica o veículo, portanto não pode se repetir (exceto no próprio registro). */
  #assertPlacaDisponivel(placa, ignoreId) {
    const duplicado = this.automovelRepository.findAll((a) => a.placa === placa && a.id !== ignoreId);
    if (duplicado.length > 0) {
      throw new ConflictError(`Já existe um automóvel cadastrado com a placa ${placa}.`);
    }
  }
}

module.exports = AutomovelService;
