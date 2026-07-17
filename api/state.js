import { createClient } from 'redis';

const KEY = 'eew:current';

let client;
async function getClient() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (err) => console.error('Redis client error', err));
  }
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const redis = await getClient();

  if (req.method === 'GET') {
    const raw = await redis.get(KEY);
    const state = raw ? JSON.parse(raw) : { idle: true };
    return res.status(200).json(state);
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    body = body || {};

    const state = body.reset
      ? { idle: true, updatedAt: Date.now() }
      : { ...body, idle: false, updatedAt: Date.now() };

    await redis.set(KEY, JSON.stringify(state));
    return res.status(200).json(state);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
