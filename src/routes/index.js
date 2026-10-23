const { Router } = require('express');

/**
 * Monta todas as rotas da API a partir dos controllers.
 *
 *  /automoveis   CRUD de automóveis (filtros: ?cor= & ?marca=)
 *  /motoristas   CRUD de motoristas (filtro: ?nome=)
 *  /utilizacoes  início, finalização e listagem das utilizações
 */
function createRoutes({ automovelController, motoristaController, utilizacaoController }) {
  const router = Router();

  router.post('/automoveis', automovelController.create);
  router.get('/automoveis', automovelController.list);
  router.get('/automoveis/:id', automovelController.getById);
  router.put('/automoveis/:id', automovelController.update);
  router.delete('/automoveis/:id', automovelController.remove);

  router.post('/motoristas', motoristaController.create);
  router.get('/motoristas', motoristaController.list);
  router.get('/motoristas/:id', motoristaController.getById);
  router.put('/motoristas/:id', motoristaController.update);
  router.delete('/motoristas/:id', motoristaController.remove);

  router.post('/utilizacoes', utilizacaoController.iniciar);
  router.patch('/utilizacoes/:id/finalizar', utilizacaoController.finalizar);
  router.get('/utilizacoes', utilizacaoController.list);

  return router;
}

module.exports = createRoutes;
