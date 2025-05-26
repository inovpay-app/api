const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Base URL da API do Bubble
const BASE_URL = process.env.BASE_URL || 'https://gatewayinovpay.bubbleapps.io/version-test/api/1.1/wf';

app.all('*', async (req, res) => {
    try {
        const response = await axios({
            method: req.method,
            url: `${BASE_URL}${req.path}`,
            headers: { ...req.headers },
            data: req.body
        });

        res.status(response.status).send(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        const data = error.response?.data || { error: 'Erro no proxy' };

        // Regra de transformação para /login
        if (
            req.path === '/login' &&
            status === 400 &&
            data.reason === 'INVALID_LOGIN_CREDENTIALS'
        ) {
            return res.status(401).send({
                statusCode: 401,
                message: 'Credenciais Inválidas'
            });
        }

        res.status(status).send(data);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Proxy cego rodando na porta ${PORT}`);
});
