const PAGBANK_API = 'https://api.pagseguro.com';

function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const token = process.env.PAGBANK_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'PAGBANK_TOKEN não está configurado na Vercel.' });
  }

  try {
    const { name, email, cpf, phone } = req.body || {};
    const taxId = onlyDigits(cpf);
    let phoneDigits = onlyDigits(phone);

    if (phoneDigits.startsWith('55') && phoneDigits.length >= 12) {
      phoneDigits = phoneDigits.slice(2);
    }

    if (!name || !email || taxId.length !== 11 || ![10, 11].includes(phoneDigits.length)) {
      return res.status(400).json({
        error: 'Preencha nome, e-mail, CPF com 11 dígitos e celular com DDD.'
      });
    }

    const area = phoneDigits.slice(0, 2);
    const number = phoneDigits.slice(2);
    const reference = `teste-pix-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const payload = {
      reference_id: reference,
      customer: {
        name: String(name).trim(),
        email: String(email).trim(),
        tax_id: taxId,
        phones: [
          {
            country: '55',
            area,
            number,
            type: 'MOBILE'
          }
        ]
      },
      items: [
        {
          reference_id: 'produto-teste-download',
          name: 'Produto teste para download',
          quantity: 1,
          unit_amount: 1
        }
      ],
      charges: [
        {
          reference_id: reference,
          description: 'Teste real de pagamento Pix - R$ 0,01',
          amount: {
            value: 1,
            currency: 'BRL'
          },
          payment_method: {
            type: 'PIX',
            pix: {
              expiration_date: expiration
            }
          }
        }
      ]
    };

    const response = await fetch(`${PAGBANK_API}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const code = data?.error_messages?.[0]?.code;
      const description = data?.error_messages?.[0]?.description;
      let message = description || 'O PagBank recusou a criação do Pix.';

      if (response.status === 403 && code === 'ACCESS_DENIED') {
        message = 'O token foi reconhecido, mas a API de Pedidos do PagBank ainda não está liberada para produção nesta conta (whitelist/homologação).';
      }

      return res.status(response.status).json({ error: message, code: code || null });
    }

    const charge = data?.charges?.[0];
    const qrImage = charge?.links?.find((link) => link.rel === 'QRCODE.PNG')?.href || null;
    const qrText = charge?.qr_code?.text || null;

    if (!data?.id || !charge || !qrText) {
      return res.status(502).json({ error: 'O PagBank respondeu, mas não retornou o QR Code esperado.' });
    }

    return res.status(201).json({
      orderId: data.id,
      status: charge.status,
      qrText,
      qrImage,
      expiresAt: charge?.payment_method?.pix?.expiration_date || expiration
    });
  } catch (error) {
    console.error('create-pix error:', error);
    return res.status(500).json({ error: 'Falha interna ao gerar o Pix.' });
  }
};
