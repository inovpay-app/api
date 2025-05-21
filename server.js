const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const CLIENTS = {
  'cliente123': 'segredo456',
};

const JWT_SECRET = process.env.JWT_SECRET;

// === Autenticação do cliente ===
app.post('/auth/token', (req, res) => {
  const { client_id, client_secret } = req.body;

  if (!client_id || !client_secret || CLIENTS[client_id] !== client_secret) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ client_id }, JWT_SECRET, { expiresIn: '1h' });

  res.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 3600
  });
});

// === Middleware de autenticação ===
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token ausente' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.client_id = decoded.client_id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// === Autenticação com o fornecedor (Paytime) ===
let cachedToken = null;
let tokenExpiresAt = null;

async function getPaytimeToken() {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt && now < tokenExpiresAt) {
    return cachedToken;
  }

  const loginPayload = {
    "integration-key": process.env.PAYTIME_INTEGRATION_KEY,
    "authentication-key": process.env.PAYTIME_AUTH_KEY,
    "x-token": process.env.PAYTIME_X_TOKEN
  };

  const headers = {
    'accept': 'application/json',
    'content-type': 'application/json'
  };

  const response = await axios.post(process.env.PAYTIME_LOGIN_URL, loginPayload, { headers });

  const token = response.data?.token || response.data?.access_token;
  if (!token) throw new Error('Token não retornado pela Paytime');

  cachedToken = token;
  tokenExpiresAt = now + 50 * 60 * 1000;

  return token;
}

// === Proxy genérico ===
app.use('/v1/*', authenticate, async (req, res) => {
  try {
    const token = await getPaytimeToken();

    const fullUrl = `${process.env.PAYTIME_API_BASE}${req.originalUrl.replace(/^\/v1/, '')}`;

    const response = await axios({
      method: req.method,
      url: fullUrl,
      headers: {
        ...req.headers,
        host: undefined,
        authorization: `Bearer ${token}`
      },
      data: req.body
    });

    res.status(response.status).send(response.data);
  } catch (err) {
    console.error('Erro no proxy:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: 'Erro ao consultar API do fornecedor',
      detalhes: err.response?.data || err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy iniciado na porta ${PORT}`);
});
