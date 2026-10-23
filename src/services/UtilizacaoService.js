const { ConflictError, NotFoundError, ValidationError } = require('../errors/AppError');
const { requireNonEmptyString, parseDate } = require('../utils/validators');

/**
 * Regras de negócio da utilização de automóveis.
 *
 * Uma utilização está "em andamento" enquanto não possui `dataFim`.
 *  - Um automóvel só pode ter uma utilização em andamento por vez.
 *  - Um motorista só pode ter uma utilização em andamento por vez.
 */
class UtilizacaoService {
  /**
   * @param {object} repositories
   * @param {() => Date} [now] relógio injetável, facilita os testes.
   */
  constructor({ utilizacaoRepository, automovelRepository, motoristaRepository }, now = () => new Date()) {
    this.utilizacaoRepository = utilizacaoRepository;
    this.automovelRepository = automovelRepository;
    this.motoristaRepository = motoristaRepository;
    this.now = now;
  }

  /** Registra o início da utilização de um automóvel por um motorista. */
  iniciar({ motoristaId, automovelId, motivo, dataInicio } = {}) {
    const motivoUtilizacao = requireNonEmptyString(motivo, 'motivo');
    const inicio = dataInicio === undefined ? this.now() : parseDate(dataInicio, 'dataInicio');

    const motorista = this.#findMotorista(motoristaId);
    const automovel = this.#findAutomovel(automovelId);

    if (this.#emAndamento((u) => u.automovelId === automovel.id)) {
      throw new ConflictError('O automóvel informado já está sendo utilizado por outro motorista.');
    }
    if (this.#emAndamento((u) => u.motoristaId === motorista.id)) {
      throw new ConflictError('O motorista informado já está utilizando outro automóvel.');
    }

    const utilizacao = this.utilizacaoRepository.create({
      motoristaId: motorista.id,
      automovelId: automovel.id,
      motivo: motivoUtilizacao,
      dataInicio: inicio.toISOString(),
      dataFim: null,
    });
    return this.#toView(utilizacao);
  }

  /** Finaliza uma utilização em andamento, registrando a data de término. */
  finalizar(id, { dataFim } = {}) {
    const utilizacao = this.utilizacaoRepository.findById(id);
    if (!utilizacao) {
      throw new NotFoundError(`Utilização "${id}" não encontrada.`);
    }
    if (utilizacao.dataFim) {
      throw new ConflictError('Esta utilização já foi finalizada.');
    }

    const fim = dataFim === undefined ? this.now() : parseDate(dataFim, 'dataFim');
    if (fim < new Date(utilizacao.dataInicio)) {
      throw new ValidationError('A data de finalização não pode ser anterior à data de início.');
    }

    const finalizada = this.utilizacaoRepository.update(id, { dataFim: fim.toISOString() });
    return this.#toView(finalizada);
  }

  /** Lista todas as utilizações, já com o nome do motorista e os dados do automóvel. */
  list() {
    return this.utilizacaoRepository.findAll().map((utilizacao) => this.#toView(utilizacao));
  }

  #findMotorista(motoristaId) {
    const motorista = this.motoristaRepository.findById(motoristaId);
    if (!motorista) {
      throw new NotFoundError(`Motorista "${motoristaId}" não encontrado.`);
    }
    return motorista;
  }

  #findAutomovel(automovelId) {
    const automovel = this.automovelRepository.findById(automovelId);
    if (!automovel) {
      throw new NotFoundError(`Automóvel "${automovelId}" não encontrado.`);
    }
    return automovel;
  }

  #emAndamento(predicate) {
    return this.utilizacaoRepository.findAll((u) => !u.dataFim && predicate(u)).length > 0;
  }

  /** Monta a representação exposta pela API, substituindo os ids pelos dados completos. */
  #toView({ motoristaId, automovelId, ...utilizacao }) {
    const motorista = this.motoristaRepository.findById(motoristaId);
    const automovel = this.automovelRepository.findById(automovelId);

    return {
      ...utilizacao,
      motorista: { id: motorista.id, nome: motorista.nome },
      automovel,
    };
  }
}

module.exports = UtilizacaoService;
