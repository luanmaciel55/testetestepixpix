module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const { handle } = req.body || {};
    const cleanHandle = String(handle || '').trim().replace(/^\$/,'');

    if (!cleanHandle) {
      return res.status(400).json({ error: 'Informe sua InfiniteTag sem o símbolo $.' });
    }

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${proto}://${host}`;
    const orderNsu = `teste-infinitepay-${Date.now()}`;

    const payload = {
      handle: cleanHandle,
      order_nsu: orderNsu,
      redirect_url: `${origin}/infinitepay-sucesso.html`,
      items: [
        {
          quantity: 1,
          price: 100,
          description: 'Teste InfinitePay - R$ 1,00'
        }
      ]
    };

    const response = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = data?.message || data?.error || 'A InfinitePay recusou a criação do checkout.';
      return res.status(response.status).json({ error: msg, details: data });
    }

    const checkoutUrl = data?.url || data?.checkout_url || data?.link || data?.payment_url || null;

    if (!checkoutUrl) {
      return res.status(502).json({
        error: 'A InfinitePay respondeu, mas não encontrei a URL do checkout na resposta.',
        details: data
      });
    }

    return res.status(201).json({
      checkoutUrl,
      orderNsu,
      amount: 100
    });
  } catch (err) {
    console.error('infinitepay-create:', err);
    return res.status(500).json({ error: 'Falha interna ao criar o checkout InfinitePay.' });
  }
};
