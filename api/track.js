// ছোট সার্ভার ফাংশন: ব্রাউজার থেকে আসা ট্র্যাকিং মেসেজ টেলিগ্রামে পাঠায়।
// টোকেন আর চ্যাট আইডি কোডে নেই, ভার্সেলের Environment Variables-এ থাকে:
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed' });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    if (!body || typeof body !== 'object') body = {};

    const text = typeof body.text === 'string' ? body.text.slice(0, 3500) : '';
    if (!text) {
      res.status(200).json({ ok: false, error: 'empty text' });
      return;
    }

    // ভার্সেল নিজে থেকেই আইপি অনুযায়ী আনুমানিক দেশ/শহর হেডারে দেয়, আলাদা সার্ভিস লাগে না
    const country = req.headers['x-vercel-ip-country'] || '';
    const region = req.headers['x-vercel-ip-country-region'] || '';
    let city = req.headers['x-vercel-ip-city'] || '';
    try { city = city ? decodeURIComponent(city) : ''; } catch (e) {}
    const geoParts = [city, region, country].filter(Boolean);
    const geoLine = geoParts.length ? ('\n📍 আইপি অনুযায়ী: ' + geoParts.join(', ')) : '';

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      res.status(200).json({ ok: false, error: 'telegram not configured' });
      return;
    }

    const fullText = text + geoLine;
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: fullText, disable_web_page_preview: true })
    });
    const tgJson = await tgRes.json().catch(() => ({}));
    // ok না হলে টেলিগ্রামের নিজের এরর-বার্তাটা দেখায়, যাতে সমস্যাটা ধরা যায় (কোনো গোপন তথ্য নয়)
    res.status(200).json({ ok: !!tgJson.ok, telegram_error: tgJson.ok ? undefined : (tgJson.description || 'unknown') });
  } catch (e) {
    res.status(200).json({ ok: false, error: 'server error' });
  }
};
