import { photoURL, readLimited, request } from './catalog.js';

export async function handlePhoto(requestIn, { fetcher = fetch } = {}) {
  const fail = (error, status) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
  if (requestIn.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET' } });
  const value = new URL(requestIn.url).searchParams.get('url') || '';
  const url = value.startsWith('https://') && value.length <= 4096 ? photoURL(value) : null;
  if (!url) return fail('Use a public Ace picture link. Other pictures can be pasted or selected from a file.', 400);
  try {
    const response = await request(url, fetcher, next => Boolean(photoURL(next)));
    const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!response.ok || !['image/png', 'image/jpeg', 'image/webp'].includes(type)) {
      await response.body?.cancel();
      return fail('This picture is unavailable. Paste it or choose an image file.', 502);
    }
    return new Response(await readLimited(response, 6_000_000), {
      headers: { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch { return fail('This picture is unavailable. Paste it or choose an image file.', 502); }
}
