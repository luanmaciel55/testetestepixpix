module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const { handle, order_nsu, transaction_nsu, slug } = req.body || {};
    const cleanHandle = String(handle || '').trim().replace(/^\$/,'');

    if (!cleanHandle || !order_nsu || !transaction_nsu || !slug) {
      return res.status(400).json({ error: 'Dados de retorno da InfinitePay incompletos.' });
    }

    const response = await fetch('https://api.checkout.infinitepay.io/payment_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        handle: cleanHandle,
        order_nsu: String(order_nsu),
        transaction_nsu: String(transaction_nsu),
        slug: String(slug)
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Não foi possível verificar o pagamento na InfinitePay.', details: data });
    }

    const paid = data?.paid === true;
    const amount = Number(data?.amount || 0);
    const amountOk = amount === 100;

    return res.status(200).json({
      success: data?.success === true,
      paid,
      amount,
      paidAmount: Number(data?.paid_amount || 0),
      installments: data?.installments || null,
      captureMethod: data?.capture_method || null,
      validForDownload: paid && amountOk
    });
  } catch (err) {
    console.error('infinitepay-check:', err);
    return res.status(500).json({ error: 'Falha interna ao verificar o pagamento.' });
  }
};
