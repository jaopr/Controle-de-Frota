const InMemoryRepository = require('../../src/repositories/InMemoryRepository');
const UtilizacaoService = require('../../src/services/UtilizacaoService');
const { ConflictError, NotFoundError, ValidationError } = require('../../src/errors/AppError');

describe('UtilizacaoService', () => {
  const AGORA = new Date('2026-10-23T12:00:00.000Z');

  let service;
  let automovelRepository;
  let motoristaRepository;
  let carro1;
  let carro2;
  let maria;
  let joao;

  beforeEach(() => {
    automovelRepository = new InMemoryRepository();
    motoristaRepository = new InMemoryRepository();
    service = new UtilizacaoService(
      { utilizacaoRepository: new InMemoryRepository(), automovelRepository, motoristaRepository },
      () => AGORA,
    );

    carro1 = automovelRepository.create({ placa: 'AAA1111', cor: 'Azul', marca: 'Fiat' });
    carro2 = automovelRepository.create({ placa: 'BBB2222', cor: 'Preto', marca: 'Ford' });
    maria = motoristaRepository.create({ nome: 'Maria' });
    joao = motoristaRepository.create({ nome: 'João' });
  });

  const iniciar = (motorista, automovel, extra = {}) =>
    service.iniciar({ motoristaId: motorista.id, automovelId: automovel.id, motivo: 'Visita a cliente', ...extra });

  describe('iniciar', () => {
    it('registra a utilização usando a data atual por padrão', () => {
      const utilizacao = iniciar(maria, carro1);

      expect(utilizacao).toEqual({
        id: expect.any(String),
        dataInicio: AGORA.toISOString(),
        dataFim: null,
        motivo: 'Visita a cliente',
        motorista: { id: maria.id, nome: 'Maria' },
        automovel: carro1,
      });
    });

    it('aceita uma data de início informada', () => {
      const utilizacao = iniciar(maria, carro1, { dataInicio: '2026-10-20T08:00:00Z' });

      expect(utilizacao.dataInicio).toBe('2026-10-20T08:00:00.000Z');
    });

    it('rejeita motivo vazio e data inválida', () => {
      expect(() => iniciar(maria, carro1, { motivo: ' ' })).toThrow(ValidationError);
      expect(() => iniciar(maria, carro1, { dataInicio: 'ontem' })).toThrow(ValidationError);
    });

    it('lança erro quando motorista ou automóvel não existem', () => {
      expect(() => iniciar({ id: 'x' }, carro1)).toThrow(NotFoundError);
      expect(() => iniciar(maria, { id: 'x' })).toThrow(NotFoundError);
    });

    it('impede que um automóvel em uso seja utilizado por outro motorista', () => {
      iniciar(maria, carro1);

      expect(() => iniciar(joao, carro1)).toThrow(ConflictError);
    });

    it('impede que um motorista que já está utilizando um automóvel utilize outro', () => {
      iniciar(maria, carro1);

      expect(() => iniciar(maria, carro2)).toThrow(ConflictError);
    });

    it('permite utilizações simultâneas de motoristas e automóveis diferentes', () => {
      iniciar(maria, carro1);

      expect(() => iniciar(joao, carro2)).not.toThrow();
    });
  });

  describe('finalizar', () => {
    it('registra a data de término usando a data atual por padrão', () => {
      const { id } = iniciar(maria, carro1, { dataInicio: '2026-10-23T08:00:00Z' });

      const finalizada = service.finalizar(id);

      expect(finalizada.dataFim).toBe(AGORA.toISOString());
    });

    it('aceita uma data de término informada', () => {
      const { id } = iniciar(maria, carro1, { dataInicio: '2026-10-23T08:00:00Z' });

      const finalizada = service.finalizar(id, { dataFim: '2026-10-23T10:30:00Z' });

      expect(finalizada.dataFim).toBe('2026-10-23T10:30:00.000Z');
    });

    it('libera o automóvel e o motorista para novas utilizações', () => {
      const { id } = iniciar(maria, carro1);

      service.finalizar(id);

      expect(() => iniciar(joao, carro1)).not.toThrow();
      expect(() => iniciar(maria, carro2)).not.toThrow();
    });

    it('lança erro quando a utilização não existe', () => {
      expect(() => service.finalizar('inexistente')).toThrow(NotFoundError);
    });

    it('impede finalizar duas vezes a mesma utilização', () => {
      const { id } = iniciar(maria, carro1);
      service.finalizar(id);

      expect(() => service.finalizar(id)).toThrow(ConflictError);
    });

    it('rejeita data de término anterior ao início ou inválida', () => {
      const { id } = iniciar(maria, carro1, { dataInicio: '2026-10-23T08:00:00Z' });

      expect(() => service.finalizar(id, { dataFim: '2026-10-22T08:00:00Z' })).toThrow(ValidationError);
      expect(() => service.finalizar(id, { dataFim: 'abc' })).toThrow(ValidationError);
    });
  });

  describe('list', () => {
    it('retorna as utilizações com nome do motorista e dados do automóvel', () => {
      iniciar(maria, carro1);
      iniciar(joao, carro2);

      const lista = service.list();

      expect(lista).toHaveLength(2);
      expect(lista[0]).toMatchObject({ motorista: { nome: 'Maria' }, automovel: { placa: 'AAA1111', cor: 'Azul', marca: 'Fiat' } });
      expect(lista[1]).toMatchObject({ motorista: { nome: 'João' }, automovel: { placa: 'BBB2222' } });
    });

    it('retorna lista vazia quando não há utilizações', () => {
      expect(service.list()).toEqual([]);
    });
  });
});
