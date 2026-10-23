const InMemoryRepository = require('../../src/repositories/InMemoryRepository');
const AutomovelService = require('../../src/services/AutomovelService');
const { ConflictError, NotFoundError, ValidationError } = require('../../src/errors/AppError');

describe('AutomovelService', () => {
  let service;
  let utilizacaoRepository;

  beforeEach(() => {
    utilizacaoRepository = new InMemoryRepository();
    service = new AutomovelService(new InMemoryRepository(), utilizacaoRepository);
  });

  const fusca = { placa: 'ABC1234', cor: 'Azul', marca: 'Volkswagen' };

  describe('create', () => {
    it('cadastra um automóvel e gera um identificador', () => {
      const automovel = service.create(fusca);

      expect(automovel).toEqual({ id: expect.any(String), ...fusca });
    });

    it('normaliza a placa (maiúsculas, sem hífen) e aceita o padrão Mercosul', () => {
      expect(service.create({ ...fusca, placa: 'abc-1234' }).placa).toBe('ABC1234');
      expect(service.create({ ...fusca, placa: 'BRA1D23' }).placa).toBe('BRA1D23');
    });

    it.each([
      ['placa ausente', { cor: 'Azul', marca: 'VW' }],
      ['placa inválida', { placa: '123ABCD', cor: 'Azul', marca: 'VW' }],
      ['cor vazia', { placa: 'ABC1234', cor: '  ', marca: 'VW' }],
      ['marca ausente', { placa: 'ABC1234', cor: 'Azul' }],
    ])('rejeita dados inválidos: %s', (_descricao, payload) => {
      expect(() => service.create(payload)).toThrow(ValidationError);
    });

    it('rejeita placa já cadastrada', () => {
      service.create(fusca);

      expect(() => service.create({ ...fusca, cor: 'Preto' })).toThrow(ConflictError);
    });
  });

  describe('update', () => {
    it('atualiza os dados do automóvel', () => {
      const { id } = service.create(fusca);

      const atualizado = service.update(id, { placa: 'ABC1234', cor: 'Vermelho', marca: 'Fiat' });

      expect(atualizado).toEqual({ id, placa: 'ABC1234', cor: 'Vermelho', marca: 'Fiat' });
      expect(service.getById(id)).toEqual(atualizado);
    });

    it('permite manter a própria placa, mas não usar a de outro automóvel', () => {
      service.create(fusca);
      const outro = service.create({ ...fusca, placa: 'DEF5678' });

      expect(() => service.update(outro.id, { ...fusca, placa: 'DEF5678' })).not.toThrow();
      expect(() => service.update(outro.id, fusca)).toThrow(ConflictError);
    });

    it('lança erro quando o automóvel não existe', () => {
      expect(() => service.update('inexistente', fusca)).toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it('exclui o automóvel', () => {
      const { id } = service.create(fusca);

      service.remove(id);

      expect(() => service.getById(id)).toThrow(NotFoundError);
    });

    it('lança erro quando o automóvel não existe', () => {
      expect(() => service.remove('inexistente')).toThrow(NotFoundError);
    });

    it('impede a exclusão de automóvel com histórico de utilização', () => {
      const { id } = service.create(fusca);
      utilizacaoRepository.create({ automovelId: id, motoristaId: 'm1' });

      expect(() => service.remove(id)).toThrow(ConflictError);
      expect(service.getById(id)).toBeDefined();
    });
  });

  describe('getById', () => {
    it('recupera o automóvel pelo identificador', () => {
      const criado = service.create(fusca);

      expect(service.getById(criado.id)).toEqual(criado);
    });

    it('lança erro quando não encontra', () => {
      expect(() => service.getById('inexistente')).toThrow(NotFoundError);
    });
  });

  describe('list', () => {
    beforeEach(() => {
      service.create({ placa: 'AAA1111', cor: 'Azul', marca: 'Fiat' });
      service.create({ placa: 'BBB2222', cor: 'Azul', marca: 'Ford' });
      service.create({ placa: 'CCC3333', cor: 'Preto', marca: 'Fiat' });
    });

    it('lista todos quando não há filtros', () => {
      expect(service.list()).toHaveLength(3);
    });

    it('filtra por cor', () => {
      const resultado = service.list({ cor: 'azul' });

      expect(resultado.map((a) => a.placa)).toEqual(['AAA1111', 'BBB2222']);
    });

    it('filtra por marca', () => {
      const resultado = service.list({ marca: 'FIAT' });

      expect(resultado.map((a) => a.placa)).toEqual(['AAA1111', 'CCC3333']);
    });

    it('combina os filtros de cor e marca', () => {
      const resultado = service.list({ cor: 'Azul', marca: 'Fiat' });

      expect(resultado.map((a) => a.placa)).toEqual(['AAA1111']);
    });

    it('retorna lista vazia quando nada corresponde', () => {
      expect(service.list({ cor: 'Verde' })).toEqual([]);
    });
  });
});
