require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { initDb, validarCliente } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'chave_padrao';

app.use(express.json());

initDb()
  .then(() => console.log('Banco de dados iniciado.'))
  .catch(console.error);

// 🔐 Autenticação do cliente
app.post('/auth', async (req, res) => {
  const { clientID, clientSecret } = req.body;

  if (!clientID || !clientSecret) {
    return res.status(400).json({ error: 'clientID e clientSecret são obrigatórios.' });
  }

  const client = await validarCliente(clientID, clientSecret);
  if (!client) return res.status(401).json({ error: 'Credenciais inválidas.' });

  const payload = {
    clientID: client.client_id,
    representativeID: client.representativeID
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

  res.json({ token, clientInfo: payload });
});

// 🛡️ Middleware de autenticação
function autenticarJWT(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token ausente ou inválido.' });
  }

  const token = auth.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token expirado ou inválido.' });
  }
}

// 🔄 Login na Paytime

let cachedToken = {
  token: null,
  expiresAt: null
};

async function getPaytimeToken() {
  const now = Date.now();

  if (cachedToken.token && cachedToken.expiresAt && now < cachedToken.expiresAt) {
    return cachedToken.token; // ✅ Token ainda válido
  }

  const response = await axios.post(process.env.PAYTIME_LOGIN_URL, {
    "integration-key": process.env.PAYTIME_INTEGRATION_KEY,
    "authentication-key": process.env.PAYTIME_AUTH_KEY,
    "x-token": process.env.PAYTIME_X_TOKEN
  }, {
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json'
    }
  });

  const token = response.data.token;
  const expiresInSeconds = response.data.expires_in || 3600; // fallback de 1h

  cachedToken = {
    token,
    expiresAt: now + expiresInSeconds * 1000
  };

  return token;
}





// 🔁 Proxy cego genérico
app.all('/proxy/*', autenticarJWT, async (req, res) => {
  try {
    const targetPath = req.originalUrl.replace('/proxy', '');
    const fullUrl = `${process.env.PAYTIME_API_BASE}${targetPath}`;

    const paytimeToken = await getPaytimeToken();

    const headers = {
      ...req.headers,
      authorization: `Bearer ${paytimeToken}`
    };

    delete headers['host'];
    delete headers['content-length'];

    const response = await axios({
      method: req.method,
      url: fullUrl,
      data: req.body,
      headers
    });

    res.status(response.status).send(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || { error: 'Erro inesperado no proxy.' };
    console.error(data);
    res.status(status).json(data);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});