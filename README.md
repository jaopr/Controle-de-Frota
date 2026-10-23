# API de Controle de Frota

WebAPI REST para controlar a utilização dos automóveis de uma empresa: cadastro de automóveis, cadastro de motoristas e registro de utilização, respeitando as regras de negócio abaixo.

Desenvolvida em **Node.js + Express**, com **persistência em memória** (os dados são perdidos ao reiniciar o servidor) e testes automatizados com **Jest** e **Supertest**.

## Regras de negócio

- Um automóvel só pode ser utilizado por **um motorista por vez**.
- Um motorista que já está utilizando um automóvel **não pode utilizar outro** ao mesmo tempo.
- Uma utilização está "em andamento" enquanto não tem `dataFim`; ao finalizá-la, automóvel e motorista são liberados.

Decisões adicionais (não especificadas no enunciado):

- A **placa** é única, é normalizada (maiúsculas, sem hífen) e aceita os formatos `ABC1234` e Mercosul `ABC1D23`.
- Automóveis e motoristas que **já possuem registros de utilização não podem ser excluídos** (`409`), para não quebrar o histórico.
- Filtros: `cor` e `marca` comparam o valor exato; `nome` busca por trecho. Todos ignoram maiúsculas/minúsculas e acentos.
- `dataInicio` e `dataFim` são opcionais nas requisições (padrão: momento atual), aceitam ISO 8601 e a data de término não pode ser anterior à de início.

## Requisitos

- Node.js 18 ou superior

## Como executar

```bash
npm install
npm start          # http://localhost:3000  (porta configurável via variável PORT)
npm run dev        # reinicia automaticamente ao alterar o código
```

## Como testar

```bash
npm test               # executa os testes unitários e de integração
npm run test:coverage  # idem, com relatório de cobertura
```

- `tests/unit/` — testes unitários das regras de negócio (serviços).
- `tests/integration/` — testes ponta a ponta da API HTTP (rotas, códigos de status, filtros).

## Endpoints

### Automóveis — `/automoveis`

| Método | Rota                | Descrição                                          |
|--------|---------------------|----------------------------------------------------|
| POST   | `/automoveis`       | Cadastra um automóvel                              |
| GET    | `/automoveis`       | Lista automóveis (filtros: `?cor=` e `?marca=`)    |
| GET    | `/automoveis/:id`   | Recupera um automóvel                              |
| PUT    | `/automoveis/:id`   | Atualiza um automóvel (corpo completo)             |
| DELETE | `/automoveis/:id`   | Exclui um automóvel                                |

Corpo: `{ "placa": "ABC1D23", "cor": "Azul", "marca": "Fiat" }`

### Motoristas — `/motoristas`

| Método | Rota                | Descrição                                   |
|--------|---------------------|---------------------------------------------|
| POST   | `/motoristas`       | Cadastra um motorista                       |
| GET    | `/motoristas`       | Lista motoristas (filtro: `?nome=`)         |
| GET    | `/motoristas/:id`   | Recupera um motorista                       |
| PUT    | `/motoristas/:id`   | Atualiza um motorista                       |
| DELETE | `/motoristas/:id`   | Exclui um motorista                         |

Corpo: `{ "nome": "Maria Silva" }`

### Utilização — `/utilizacoes`

| Método | Rota                          | Descrição                                                               |
|--------|-------------------------------|-------------------------------------------------------------------------|
| POST   | `/utilizacoes`                | Inicia a utilização de um automóvel por um motorista                    |
| PATCH  | `/utilizacoes/:id/finalizar`  | Finaliza a utilização, registrando a data de término                    |
| GET    | `/utilizacoes`                | Lista as utilizações com o nome do motorista e os dados do automóvel    |

Corpo para iniciar:

```json
{
  "motoristaId": "<id>",
  "automovelId": "<id>",
  "motivo": "Visita a cliente",
  "dataInicio": "2026-10-23T08:00:00Z"
}
```

Corpo para finalizar (opcional): `{ "dataFim": "2026-10-23T10:30:00Z" }`

Exemplo de item da listagem:

```json
{
  "id": "…",
  "dataInicio": "2026-10-23T08:00:00.000Z",
  "dataFim": null,
  "motivo": "Visita a cliente",
  "motorista": { "id": "…", "nome": "Maria Silva" },
  "automovel": { "id": "…", "placa": "ABC1D23", "cor": "Azul", "marca": "Fiat" }
}
```

### Códigos de resposta

| Status | Significado                                                                 |
|--------|-----------------------------------------------------------------------------|
| 200 / 201 / 204 | Sucesso (consulta/atualização, criação, exclusão)                  |
| 400    | Dados inválidos (campo ausente, placa inválida, data inválida, JSON malformado) |
| 404    | Recurso ou rota não encontrada                                              |
| 409    | Conflito de regra de negócio (placa duplicada, automóvel/motorista em uso, exclusão com histórico, utilização já finalizada) |

Erros seguem o formato `{ "erro": "mensagem explicativa" }`.

## Exemplo de uso (curl)

```bash
# cadastra motorista e automóvel
curl -s -X POST localhost:3000/motoristas  -H 'Content-Type: application/json' -d '{"nome":"Maria Silva"}'
curl -s -X POST localhost:3000/automoveis -H 'Content-Type: application/json' -d '{"placa":"ABC1D23","cor":"Azul","marca":"Fiat"}'

# inicia a utilização (use os ids retornados acima)
curl -s -X POST localhost:3000/utilizacoes -H 'Content-Type: application/json' \
  -d '{"motoristaId":"<id-motorista>","automovelId":"<id-automovel>","motivo":"Visita a cliente"}'

# lista e finaliza
curl -s localhost:3000/utilizacoes
curl -s -X PATCH localhost:3000/utilizacoes/<id-utilizacao>/finalizar

# filtros
curl -s 'localhost:3000/automoveis?cor=azul&marca=fiat'
curl -s 'localhost:3000/motoristas?nome=maria'
```

## Estrutura do projeto

```
src/
├── app.js                  # monta a aplicação (injeção de dependências); exporta createApp()
├── server.js               # ponto de entrada: sobe o servidor HTTP
├── routes/                 # mapeamento rota → controller
├── controllers/            # camada HTTP: lê a requisição e escolhe o status da resposta
├── services/               # regras de negócio e validações
├── repositories/           # persistência (em memória, com interface simples de trocar)
├── middlewares/            # tratamento centralizado de erros e rotas não encontradas
├── errors/                 # erros de domínio (400, 404, 409)
└── utils/                  # validações e normalização de texto/placa
tests/
├── unit/                   # testes das regras de negócio
└── integration/            # testes da API HTTP
```

Camadas: **rota → controller → service → repository**. Os serviços não conhecem HTTP (lançam erros de domínio que o middleware converte em respostas) e recebem seus repositórios por construtor, o que torna trocar a persistência em memória por um banco de dados uma mudança isolada na camada de repositório.
