const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const https = require('https');

const app = express();
app.use(bodyParser.json());

// URL hardcoded
const BASE_URL = 'https://gatewayinovpay.bubbleapps.io/version-test/api/1.1/wf';

// ⚠️ Contorno para erro de certificado expirado
const agent = new https.Agent({  
  rejectUnauthorized: false
});

app.all('*', async (req, res) => {
    try {
        const response = await axios({
            method: req.method,
            url: `${BASE_URL}${req.path}`,
            headers: { ...req.headers },
            data: req.body,
            httpsAgent: agent  // descomente se estiver com erro de SSL
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

            return res.status(status).send(data);
        } else if (error.request) {
            console.error('Sem resposta do Bubble:', error.message);
            return res.status(502).send({
                error: 'Sem resposta do servidor Bubble',
                details: error.message
            });
        } else {
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
