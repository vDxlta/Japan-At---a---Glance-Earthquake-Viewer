import { Redis } from '@upstash/redis';

const kv = Redis.fromEnv();
const KEY = 'eew:current';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    const state = (await kv.get(KEY)) || { idle: true };
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

    await kv.set(KEY, state);
    return res.status(200).json(state);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
