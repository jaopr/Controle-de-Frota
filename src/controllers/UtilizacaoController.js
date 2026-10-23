/** Traduz as requisições HTTP de utilização de automóveis em chamadas ao serviço. */
class UtilizacaoController {
  constructor(utilizacaoService) {
    this.service = utilizacaoService;
  }

  iniciar = (req, res) => {
    res.status(201).json(this.service.iniciar(req.body));
  };

  finalizar = (req, res) => {
    res.json(this.service.finalizar(req.params.id, req.body));
  };

  list = (req, res) => {
    res.json(this.service.list());
  };
}

module.exports = UtilizacaoController;
