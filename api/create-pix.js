const PAGBANK_API = 'https://sandbox.api.pagseguro.com';

function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  const token = process.env.PAGBANK_SANDBOX_TOKEN;
  if (!token) return res.status(500).json({ error: 'PAGBANK_SANDBOX_TOKEN não está configurado na Vercel.' });

  try {
    const { name, email, cpf, phone } = req.body || {};
    const taxId = onlyDigits(cpf);
    let phoneDigits = onlyDigits(phone);
    if (phoneDigits.startsWith('55') && phoneDigits.length >= 12) phoneDigits = phoneDigits.slice(2);
    if (!name || !email || taxId.length !== 11 || ![10,11].includes(phoneDigits.length)) {
      return res.status(400).json({ error: 'Preencha nome, e-mail, CPF com 11 dígitos e celular com DDD.' });
    }
    const reference = `sandbox-pix-${Date.now()}`;
    const expiration = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const payload = {
      reference_id: reference,
      customer: {
        name: String(name).trim(), email: String(email).trim(), tax_id: taxId,
        phones: [{ country:'55', area:phoneDigits.slice(0,2), number:phoneDigits.slice(2), type:'MOBILE' }]
      },
      items: [{ reference_id:'planilha-teste', name:'Planilha Digital - Teste Sandbox', quantity:1, unit_amount:1 }],
      charges: [{
        reference_id: reference,
        description:'Teste Sandbox Pix - R$ 0,01',
        amount:{ value:1, currency:'BRL' },
        payment_method:{ type:'PIX', pix:{ expiration_date:expiration } }
      }]
    };

    const response = await fetch(`${PAGBANK_API}/orders`, {
      method:'POST',
      headers:{ Authorization:`Bearer ${token}`, Accept:'application/json', 'Content-Type':'application/json' },
      body:JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = data?.error_messages?.[0]?.description || data?.message || 'O Sandbox PagBank recusou a criação do Pix.';
      return res.status(response.status).json({ error:msg, sandbox:true });
    }
    const charge = data?.charges?.[0];
    const qrImage = charge?.links?.find(l => l.rel === 'QRCODE.PNG')?.href || null;
    const qrText = charge?.qr_code?.text || null;
    return res.status(201).json({ orderId:data.id, status:charge?.status || 'UNKNOWN', qrText, qrImage, sandbox:true });
  } catch (e) {
    console.error('sandbox create-pix:', e);
    return res.status(500).json({ error:'Falha interna no teste Sandbox.' });
  }
};
