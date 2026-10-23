const InMemoryRepository = require('../../src/repositories/InMemoryRepository');
const MotoristaService = require('../../src/services/MotoristaService');
const { ConflictError, NotFoundError, ValidationError } = require('../../src/errors/AppError');

describe('MotoristaService', () => {
  let service;
  let utilizacaoRepository;

  beforeEach(() => {
    utilizacaoRepository = new InMemoryRepository();
    service = new MotoristaService(new InMemoryRepository(), utilizacaoRepository);
  });

  describe('create', () => {
    it('cadastra um motorista e gera um identificador', () => {
      const motorista = service.create({ nome: '  Maria Silva ' });

      expect(motorista).toEqual({ id: expect.any(String), nome: 'Maria Silva' });
    });

    it.each([[undefined], [''], ['   '], [123]])('rejeita nome inválido: %p', (nome) => {
      expect(() => service.create({ nome })).toThrow(ValidationError);
    });
  });

  describe('update', () => {
    it('atualiza o nome do motorista', () => {
      const { id } = service.create({ nome: 'Maria' });

      expect(service.update(id, { nome: 'Maria Souza' })).toEqual({ id, nome: 'Maria Souza' });
    });

    it('lança erro quando o motorista não existe', () => {
      expect(() => service.update('inexistente', { nome: 'X' })).toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it('exclui o motorista', () => {
      const { id } = service.create({ nome: 'Maria' });

      service.remove(id);

      expect(() => service.getById(id)).toThrow(NotFoundError);
    });

    it('lança erro quando o motorista não existe', () => {
      expect(() => service.remove('inexistente')).toThrow(NotFoundError);
    });

    it('impede a exclusão de motorista com histórico de utilização', () => {
      const { id } = service.create({ nome: 'Maria' });
      utilizacaoRepository.create({ motoristaId: id, automovelId: 'a1' });

      expect(() => service.remove(id)).toThrow(ConflictError);
    });
  });

  describe('getById', () => {
    it('recupera o motorista pelo identificador', () => {
      const criado = service.create({ nome: 'Maria' });

      expect(service.getById(criado.id)).toEqual(criado);
    });

    it('lança erro quando não encontra', () => {
      expect(() => service.getById('inexistente')).toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    beforeEach(() => {
      service.create({ nome: 'João Pedro' });
      service.create({ nome: 'Maria João' });
      service.create({ nome: 'Ana Clara' });
    });

    it('lista todos quando não há filtro', () => {
      expect(service.list()).toHaveLength(3);
    });

    it('filtra por trecho do nome, ignorando maiúsculas e acentos', () => {
      const resultado = service.list({ nome: 'joao' });

      expect(resultado.map((m) => m.nome)).toEqual(['João Pedro', 'Maria João']);
    });

    it('retorna lista vazia quando nada corresponde', () => {
      expect(service.list({ nome: 'zzz' })).toEqual([]);
    });
  });
});
