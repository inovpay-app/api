const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const CLIENTS = {
  'cliente123': 'segredo456',
  'clienteTest': 'senhaSegura'
};

const JWT_SECRET = process.env.JWT_SECRET;

// === Autenticação local (client_id e client_secret) ===
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

// === Middleware para validar token JWT local ===
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

// === Função para autenticar com a Paytime ===
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

 // Aqui você coloca para ver o que está vindo na resposta:
  console.log('Resposta Paytime login:', response.data);
  
  const token = response.data?.token || response.data?.access_token;

  if (!token) throw new Error('Token não retornado pela Paytime');

  // Cache token por 50 minutos
  cachedToken = token;
  tokenExpiresAt = now + 50 * 60 * 1000;

  return token;
}

// === Endpoint exemplo de proxy protegido ===
app.get('/cpf/:numero', authenticate, async (req, res) => {
  try {
    const token = await getPaytimeToken();

    const response = await axios.get(`${process.env.PAYTIME_API_BASE}/cpf/${req.params.numero}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    console.error('Erro ao consultar Paytime:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: 'Erro ao consultar fornecedor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API proxy rodando na porta ${PORT}`);
});
