/** Traduz as requisições HTTP de motoristas em chamadas ao serviço. */
class MotoristaController {
  constructor(motoristaService) {
    this.service = motoristaService;
  }

  create = (req, res) => {
    res.status(201).json(this.service.create(req.body));
  };

  list = (req, res) => {
    res.json(this.service.list({ nome: req.query.nome }));
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

module.exports = MotoristaController;
