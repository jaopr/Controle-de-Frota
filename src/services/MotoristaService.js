const { ConflictError, NotFoundError } = require('../errors/AppError');
const { requireNonEmptyString, normalizeText } = require('../utils/validators');

/** Regras de negócio do cadastro de motoristas. */
class MotoristaService {
  /**
   * @param {InMemoryRepository} motoristaRepository
   * @param {InMemoryRepository} utilizacaoRepository usado para impedir a exclusão
   *        de motoristas que possuem histórico de utilização.
   */
  constructor(motoristaRepository, utilizacaoRepository) {
    this.motoristaRepository = motoristaRepository;
    this.utilizacaoRepository = utilizacaoRepository;
  }

  create(payload = {}) {
    return this.motoristaRepository.create(this.#parsePayload(payload));
  }

  update(id, payload = {}) {
    this.getById(id);
    return this.motoristaRepository.update(id, this.#parsePayload(payload));
  }

  remove(id) {
    this.getById(id);

    const possuiUtilizacoes = this.utilizacaoRepository.findAll((u) => u.motoristaId === id).length > 0;
    if (possuiUtilizacoes) {
      throw new ConflictError('Não é possível excluir um motorista que possui registros de utilização.');
    }

    this.motoristaRepository.delete(id);
  }

  getById(id) {
    const motorista = this.motoristaRepository.findById(id);
    if (!motorista) {
      throw new NotFoundError(`Motorista "${id}" não encontrado.`);
    }
    return motorista;
  }

  /** Lista os motoristas; o filtro por nome busca trechos do nome (sem diferenciar maiúsculas/acentos). */
  list({ nome } = {}) {
    return this.motoristaRepository.findAll(
      (motorista) => nome === undefined || normalizeText(motorista.nome).includes(normalizeText(nome)),
    );
  }

  #parsePayload({ nome }) {
    return { nome: requireNonEmptyString(nome, 'nome') };
  }
}

module.exports = MotoristaService;
