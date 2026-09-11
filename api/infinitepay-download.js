module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });

  try {
    const handle = String(req.query?.handle || '').trim().replace(/^\$/,'');
    const order_nsu = String(req.query?.order_nsu || '');
    const transaction_nsu = String(req.query?.transaction_nsu || '');
    const slug = String(req.query?.slug || '');

    if (!handle || !order_nsu || !transaction_nsu || !slug) {
      return res.status(400).send('Dados do pagamento incompletos.');
    }

    const response = await fetch('https://api.checkout.infinitepay.io/payment_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ handle, order_nsu, transaction_nsu, slug })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.paid !== true || Number(data?.amount || 0) !== 100) {
      return res.status(403).send('Download bloqueado: pagamento não confirmado para este teste de R$ 1,00.');
    }

    const file = [
      'TESTE INFINITEPAY - DOWNLOAD LIBERADO',
      '',
      'Pagamento confirmado com sucesso pela API da InfinitePay.',
      `Pedido: ${order_nsu}`,
      `Método: ${data?.capture_method || 'não informado'}`,
      'Valor esperado: R$ 1,00',
      '',
      'Este é apenas um arquivo de teste.'
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="teste-infinitepay-pago.txt"');
    return res.status(200).send(file);
  } catch (err) {
    return res.status(500).send('Falha interna ao validar o download.');
  }
};
