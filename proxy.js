const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const TARGET_API = process.env.TARGET_API || 'https://jsonplaceholder.typicode.com';

const app = express();

app.use('/', createProxyMiddleware({
  target: TARGET_API,
  changeOrigin: true,
  preserveHeaderKeyCase: true,
  onProxyReq: (proxyReq, req, res) => {
    // Log para debug (opcional)
    console.log('[HEADERS RECEBIDOS]');
    console.log(req.headers);

    // Repassar todos os headers manualmente
    Object.keys(req.headers).forEach((key) => {
      proxyReq.setHeader(key, req.headers[key]);
    });
  }
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy rodando na porta ${PORT}`);
});
