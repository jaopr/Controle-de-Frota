/** Traduz as requisições HTTP de automóveis em chamadas ao serviço. */
class AutomovelController {
  constructor(automovelService) {
    this.service = automovelService;
  }

  create = (req, res) => {
    res.status(201).json(this.service.create(req.body));
  };

  list = (req, res) => {
    const { cor, marca } = req.query;
    res.json(this.service.list({ cor, marca }));
  };

  getById = (req, res) => {
    res.json(this.service.getById(req.params.id));
  };

  update = (req, res) => {
    res.json(this.service.update(req.params.id, req.body));
  };

  remove = (req, res) => {
    this.service.remove(req.params.id);
    res.status(204).send();
  };
}

module.exports = AutomovelController;
