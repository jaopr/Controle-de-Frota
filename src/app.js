const express = require('express');

const InMemoryRepository = require('./repositories/InMemoryRepository');
const AutomovelService = require('./services/AutomovelService');
const MotoristaService = require('./services/MotoristaService');
const UtilizacaoService = require('./services/UtilizacaoService');
const AutomovelController = require('./controllers/AutomovelController');
const MotoristaController = require('./controllers/MotoristaController');
const UtilizacaoController = require('./controllers/UtilizacaoController');
const createRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

/**
 * Cria uma instância isolada da aplicação (com repositórios em memória próprios).
 * Separar a criação do `listen` permite testar a API sem abrir uma porta.
 *
 * @param {{ now?: () => Date }} [options] `now` permite injetar um relógio nos testes.
 */
function createApp({ now } = {}) {
  const automovelRepository = new InMemoryRepository();
  const motoristaRepository = new InMemoryRepository();
  const utilizacaoRepository = new InMemoryRepository();

  const automovelService = new AutomovelService(automovelRepository, utilizacaoRepository);
  const motoristaService = new MotoristaService(motoristaRepository, utilizacaoRepository);
  const utilizacaoService = new UtilizacaoService(
    { utilizacaoRepository, automovelRepository, motoristaRepository },
    now,
  );

  const app = express();
  app.use(express.json());

  app.use(
    createRoutes({
      automovelController: new AutomovelController(automovelService),
      motoristaController: new MotoristaController(motoristaService),
      utilizacaoController: new UtilizacaoController(utilizacaoService),
    }),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
