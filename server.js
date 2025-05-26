const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// Clientes locais para autenticação
const CLIENTS = {
  'cliente123': 'segredo456',
  'clienteTest': 'senhaSegura'
};

const JWT_SECRET = process.env.JWT_SECRET;

// === Autenticação local - gera JWT para cliente ===
app.post('/auth/token', (req, res) => {
  const { client_id, client_secret } = req.body;

  if (!client_id || !client_secret || CLIENTS[client_id] !== client_secret) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ client_id }, JWT_SECRET, { expiresIn: '1h' });

  res.json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 360000
  });
});

// Middleware para validar token JWT local
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token ausente' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Ajuste para pegar client_id ou sub, ou outro campo que usar no token
    req.client_id = decoded.client_id || decoded.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Declaração de variáveis de cache
let cachedToken = null;
let tokenExpiresAt = 0;

// Função para obter token da Paytime (com cache)
async function getPaytimeToken() {
  const now = Date.now();

  if (cachedToken && tokenExpiresAt && now < tokenExpiresAt) {
    return cachedToken;
  }

  const loginPayload = {
    "integration-key":"38a5565e-5b7c-4bf7-b0de-e8970e42ff7d",
    "authentication-key":"5e35eacc-81f2-4145-a661-2acdffd1e679",
    "x-token":"1c4152ea-7bee-4e5a-823d-7b0077b038a8"
};

  const headers = {
    'accept': 'application/json',
    'content-type': 'application/json'
  };

  const PAYTIME_LOGIN_URL = 'https://api.sandbox.paytime.com.br/v1/auth/login';

  const response = await axios.post(PAYTIME_LOGIN_URL, loginPayload, { headers });

  const token = response.data?.token || response.data?.access_token;

  if (!token) {
    console.error('Resposta da Paytime:', response.data);
    throw new Error('Token não retornado pela Paytime');
  }

  // Cache token por 50 minutos
  cachedToken = token;
  tokenExpiresAt = now + 50 * 60 * 1000;

  return token;
}


// Proxy "cego" para chamadas à Paytime protegidas pela autenticação local


app.use('/paytime', authenticate, async (req, res) => {
  try {
    const paytimeToken = await getPaytimeToken();

    // Remove o /paytime do início para formar a URL da Paytime
    const paytimePath = req.originalUrl.replace(/^\/paytime/, '');

    // Faz a requisição para Paytime, repassando método, body, query e headers básicos
    const response = await axios({
      method: req.method,
      url: `${process.env.PAYTIME_API_BASE}${paytimePath}`,
      headers: {
        Authorization: `Bearer ${paytimeToken}`,
        Accept: 'application/json',
      },
      data: req.body,
      params: req.query
    });

    res.status(response.status).json(response.data);

  } catch (error) {
    console.error('Erro no proxy Paytime:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Erro ao acessar Paytime' });
  }
});

// Porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API proxy rodando na porta ${PORT}`);
});
