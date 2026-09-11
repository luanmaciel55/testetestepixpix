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
      return res.status(response.status).json({ error: 'Não foi possível validar o pedido.' });
    }

    const charge = data?.charges?.[0];
    if (charge?.status !== 'PAID') {
      return res.status(403).json({ error: 'Download bloqueado: pagamento ainda não confirmado.' });
    }

    const file = [
      'TESTE DE DOWNLOAD LIBERADO',
      '',
      'Pagamento Pix confirmado pelo PagBank.',
      `Pedido: ${data.id}`,
      `Confirmado em: ${charge.paid_at || 'confirmado'}`,
      '',
      'Se você conseguiu baixar este arquivo, o teste funcionou.'
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="produto-teste.txt"');
    return res.status(200).send(file);
  } catch (error) {
    console.error('download error:', error);
    return res.status(500).json({ error: 'Falha interna ao liberar o download.' });
  }
};
