import { LookupError, lookupProduct } from './catalog.js';

const cooldowns = new Map();
const json = (body, status = 200, headers = {}) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
});

export async function handleLookup(request, { fetcher = fetch, cache, waitUntil = () => {}, now = Date.now } = {}) {
  if (request.method !== 'GET') return json({ error: 'Use GET for item lookup.' }, 405, { Allow: 'GET' });
  const item = new URL(request.url).searchParams.get('item')?.trim() || '';
  if (!/^\d{4,10}$/.test(item)) return json({ error: 'Enter an Ace item number containing 4–10 digits.' }, 400);
  const key = new Request(new URL(`/api/product?item=${item}`, request.url), { method: 'GET' });
  // Cache availability should not determine whether a product can be looked up.
  const cached = await cache?.match(key).catch(() => null);
  if (cached) return cached;
  const client = request.headers.get('CF-Connecting-IP') || 'local';
  const time = now();
  if (cooldowns.size > 1000) cooldowns.clear();
  if (cooldowns.has(client) && time - cooldowns.get(client) < 5000) return json({ error: 'Please wait a few seconds before looking up another item.' }, 429, { 'Retry-After': '5' });
  cooldowns.set(client, time);
  try {
    const product = await lookupProduct(item, fetcher);
    const result = json(product, 200, { 'Cache-Control': 'public, max-age=0, s-maxage=900' });
    if (cache) waitUntil(cache.put(key, result.clone()).catch(() => {}));
    return result;
  } catch (error) {
    return json({ error: error instanceof LookupError ? error.message : 'Lookup is unavailable. Please enter the details manually.' }, error instanceof LookupError ? error.status : 502);
  }
}

export default {
  async fetch(request, env, context) {
    const path = new URL(request.url).pathname;
    if (path === '/api/product') return handleLookup(request, { cache: caches.default, waitUntil: promise => context.waitUntil(promise) });
    if (path.startsWith('/api/')) return json({ error: 'Unknown lookup endpoint.' }, 404);
    return env.ASSETS.fetch(request);
  },
};
