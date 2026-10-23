const createApp = require('./app');

const PORT = process.env.PORT || 3000;

createApp().listen(PORT, () => {
  console.log(`API de controle de frota rodando em http://localhost:${PORT}`);
});
