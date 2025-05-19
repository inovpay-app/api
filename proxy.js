const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const TARGET_API = process.env.TARGET_API || 'https://jsonplaceholder.typicode.com'; // valor default

const app = express();

app.use('/', createProxyMiddleware({
  target: TARGET_API,
  changeOrigin: true,
  preserveHeaderKeyCase: true,
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy rodando na porta ${PORT}`);
});
