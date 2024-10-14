import express from 'express';
import crypto from 'crypto';
import 'dotenv/config'
import path from 'path';

const app = express();

app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}))

const MERCHANT_ID = process.env.MERCHANT_ID;
const API_KEY = process.env.API_KEY;

app.post('/checkout', async (req, res) => {

    const payload = {
        amount: '10',
        currency: 'USD',
        order_id: crypto.randomBytes(12).toString('hex'),
        url_success: '', //ruta del proyecto en caso de que el pago se haya hecho con éxito,
        url_return: '', //volver al sitio web inicial
        url_callback: '' // para la utilización de webhooks
    }

    const sign = crypto
        .createHash('md5')
        .update(Buffer.from(JSON.stringify(payload)).toString('base64') + API_KEY)
        .digest("hex");

    const response = await fetch('https://api.cryptomus.com/v1/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            'Content-Type': 'application/json',
            merchant: MERCHANT_ID,
            sign: sign
        }
    });

    const data = await response.json();

    console.log(data);

    return res.json(data.result.url);

});

app.post('webhook', async (req, res) => {

    const { sign } = req.body;

    if (!sign) {
        return res.status(400).json({ message: 'Invalid request' });
    }

    const data = JSON.parse(req.rawBody);
    delete data.sign;

    const calculatedSign = crypto.createHash('md5')
        .update(Buffer.from(JSON.stringify(data)).toString('base64') + API_KEY)
        .digest('hex');

    if (calculatedSign !== sign) {
        return res.status(400).json({ message: 'Invalid sign' });
    }

    console.log(req.body);

    return res.sendStatus(200);

});

app.use(express.static(path.resolve('./public')))

app.listen(3000, () => {
    console.log("Server running on port 3000");
});