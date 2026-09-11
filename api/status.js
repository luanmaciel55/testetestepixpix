const PAGBANK_API = 'https://api.pagseguro.com';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const token = process.env.PAGBANK_TOKEN;
  const orderId = String(req.query?.order_id || '');

  if (!token) {
    return res.status(500).json({ error: 'PAGBANK_TOKEN não está configurado na Vercel.' });
  }

  if (!/^ORDE_[A-Za-z0-9-]+$/.test(orderId)) {
    return res.status(400).json({ error: 'Pedido inválido.' });
  }

  try {
    const response = await fetch(`${PAGBANK_API}/orders/${encodeURIComponent(orderId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Não foi possível consultar o pagamento.' });
    }

    const charge = data?.charges?.[0];
    return res.status(200).json({
      orderId: data.id,
      status: charge?.status || 'UNKNOWN',
      paidAt: charge?.paid_at || null
    });
  } catch (error) {
    console.error('status error:', error);
    return res.status(500).json({ error: 'Falha interna ao consultar o pagamento.' });
  }
};
