const request = require('supertest');
const createApp = require('../../src/app');

/** Testes ponta a ponta da API HTTP (sem abrir porta, usando supertest). */
describe('API de controle de frota', () => {
  let app;

  beforeEach(() => {
    app = createApp();
  });

  const criarAutomovel = (dados = {}) =>
    request(app).post('/automoveis').send({ placa: 'ABC1234', cor: 'Azul', marca: 'Fiat', ...dados });
  const criarMotorista = (nome = 'Maria') => request(app).post('/motoristas').send({ nome });

  describe('/automoveis', () => {
    it('executa o ciclo completo: criar, recuperar, atualizar, listar e excluir', async () => {
      const criado = await criarAutomovel();
      expect(criado.status).toBe(201);
      const { id } = criado.body;

      const recuperado = await request(app).get(`/automoveis/${id}`);
      expect(recuperado.status).toBe(200);
      expect(recuperado.body).toEqual({ id, placa: 'ABC1234', cor: 'Azul', marca: 'Fiat' });

      const atualizado = await request(app).put(`/automoveis/${id}`).send({ placa: 'ABC1234', cor: 'Preto', marca: 'Fiat' });
      expect(atualizado.status).toBe(200);
      expect(atualizado.body.cor).toBe('Preto');

      const lista = await request(app).get('/automoveis');
      expect(lista.body).toHaveLength(1);

      const excluido = await request(app).delete(`/automoveis/${id}`);
      expect(excluido.status).toBe(204);
      expect((await request(app).get(`/automoveis/${id}`)).status).toBe(404);
    });

    it('filtra a listagem por cor e marca', async () => {
      await criarAutomovel({ placa: 'AAA1111', cor: 'Azul', marca: 'Fiat' });
      await criarAutomovel({ placa: 'BBB2222', cor: 'Azul', marca: 'Ford' });
      await criarAutomovel({ placa: 'CCC3333', cor: 'Preto', marca: 'Fiat' });

      const porCor = await request(app).get('/automoveis').query({ cor: 'Azul' });
      const porMarca = await request(app).get('/automoveis').query({ marca: 'Fiat' });
      const porAmbos = await request(app).get('/automoveis').query({ cor: 'Azul', marca: 'Fiat' });

      expect(porCor.body).toHaveLength(2);
      expect(porMarca.body).toHaveLength(2);
      expect(porAmbos.body.map((a) => a.placa)).toEqual(['AAA1111']);
    });

    it('retorna 400 para dados inválidos e 409 para placa duplicada', async () => {
      const invalido = await criarAutomovel({ placa: 'xx' });
      expect(invalido.status).toBe(400);
      expect(invalido.body.erro).toMatch(/placa/i);

      await criarAutomovel();
      expect((await criarAutomovel()).status).toBe(409);
    });

    it('retorna 404 para automóvel inexistente', async () => {
      expect((await request(app).get('/automoveis/nao-existe')).status).toBe(404);
      expect((await request(app).delete('/automoveis/nao-existe')).status).toBe(404);
    });
  });

  describe('/motoristas', () => {
    it('executa o ciclo completo: criar, recuperar, atualizar, listar e excluir', async () => {
      const criado = await criarMotorista('Maria');
      expect(criado.status).toBe(201);
      const { id } = criado.body;

      expect((await request(app).get(`/motoristas/${id}`)).body).toEqual({ id, nome: 'Maria' });

      const atualizado = await request(app).put(`/motoristas/${id}`).send({ nome: 'Maria Souza' });
      expect(atualizado.body.nome).toBe('Maria Souza');

      expect((await request(app).get('/motoristas')).body).toHaveLength(1);

      expect((await request(app).delete(`/motoristas/${id}`)).status).toBe(204);
      expect((await request(app).get(`/motoristas/${id}`)).status).toBe(404);
    });

    it('filtra a listagem por nome', async () => {
      await criarMotorista('João Pedro');
      await criarMotorista('Ana Clara');

      const resultado = await request(app).get('/motoristas').query({ nome: 'joao' });

      expect(resultado.body.map((m) => m.nome)).toEqual(['João Pedro']);
    });

    it('retorna 400 quando o nome é inválido', async () => {
      expect((await criarMotorista('')).status).toBe(400);
    });
  });

  describe('/utilizacoes', () => {
    let motorista;
    let automovel;

    beforeEach(async () => {
      motorista = (await criarMotorista('Maria')).body;
      automovel = (await criarAutomovel()).body;
    });

    const iniciar = (dados = {}) =>
      request(app)
        .post('/utilizacoes')
        .send({ motoristaId: motorista.id, automovelId: automovel.id, motivo: 'Reunião externa', ...dados });

    it('inicia e finaliza uma utilização, listando com motorista e automóvel', async () => {
      const inicio = await iniciar({ dataInicio: '2026-10-23T08:00:00Z' });
      expect(inicio.status).toBe(201);
      expect(inicio.body).toMatchObject({ dataFim: null, motivo: 'Reunião externa' });

      const fim = await request(app)
        .patch(`/utilizacoes/${inicio.body.id}/finalizar`)
        .send({ dataFim: '2026-10-23T10:00:00Z' });
      expect(fim.status).toBe(200);
      expect(fim.body.dataFim).toBe('2026-10-23T10:00:00.000Z');

      const lista = await request(app).get('/utilizacoes');
      expect(lista.body).toHaveLength(1);
      expect(lista.body[0]).toMatchObject({
        motorista: { id: motorista.id, nome: 'Maria' },
        automovel: { id: automovel.id, placa: 'ABC1234', cor: 'Azul', marca: 'Fiat' },
      });
    });

    it('finaliza usando a data atual quando o corpo é omitido', async () => {
      const { body } = await iniciar();

      const fim = await request(app).patch(`/utilizacoes/${body.id}/finalizar`);

      expect(fim.status).toBe(200);
      expect(fim.body.dataFim).not.toBeNull();
    });

    it('bloqueia automóvel já em uso e motorista já utilizando outro automóvel (409)', async () => {
      await iniciar();

      const outroMotorista = (await criarMotorista('João')).body;
      const outroAutomovel = (await criarAutomovel({ placa: 'DEF5678' })).body;

      const automovelOcupado = await iniciar({ motoristaId: outroMotorista.id });
      const motoristaOcupado = await iniciar({ automovelId: outroAutomovel.id });

      expect(automovelOcupado.status).toBe(409);
      expect(motoristaOcupado.status).toBe(409);
    });

    it('retorna 404 para motorista, automóvel ou utilização inexistentes', async () => {
      expect((await iniciar({ motoristaId: 'x' })).status).toBe(404);
      expect((await iniciar({ automovelId: 'x' })).status).toBe(404);
      expect((await request(app).patch('/utilizacoes/x/finalizar')).status).toBe(404);
    });

    it('retorna 400 quando o motivo está ausente', async () => {
      expect((await iniciar({ motivo: undefined })).status).toBe(400);
    });

    it('impede excluir motorista e automóvel que possuem utilizações', async () => {
      await iniciar();

      expect((await request(app).delete(`/motoristas/${motorista.id}`)).status).toBe(409);
      expect((await request(app).delete(`/automoveis/${automovel.id}`)).status).toBe(409);
    });
  });

  describe('tratamento de erros', () => {
    it('retorna 404 para rotas desconhecidas', async () => {
      const resposta = await request(app).get('/rota-inexistente');

      expect(resposta.status).toBe(404);
      expect(resposta.body).toHaveProperty('erro');
    });

    it('retorna 400 para JSON malformado', async () => {
      const resposta = await request(app).post('/motoristas').set('Content-Type', 'application/json').send('{ invalido');

      expect(resposta.status).toBe(400);
    });
  });
});
