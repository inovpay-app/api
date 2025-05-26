const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

require('dotenv').config();

const app = express();
app.use(bodyParser.json());

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
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            // Regra: alterar erro de login
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

            // Demais erros do Bubble: repassa
            return res.status(status).send(data);
        } else if (error.request) {
            // Sem resposta: problema de rede ou timeout
            console.error('Sem resposta do Bubble:', error.message);
            return res.status(502).send({
                error: 'Sem resposta do servidor Bubble',
                details: error.message
            });
        } else {
            // Outro erro: configuração ou runtime
            console.error('Erro no proxy:', error.message);
            return res.status(500).send({
                error: 'Erro interno no proxy',
                details: error.message
            });
        }
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Proxy cego rodando na porta ${PORT}`);
});
