import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lookupProduct, parseProduct, photoURL } from '../worker/catalog.js';
import { handleLookup } from '../worker/index.js';

// Public product fields only: no cookies, session context, or authentication data.
const fixture = await readFile(new URL('./fixtures/ace-product.html', import.meta.url), 'utf8');
const item = '1043304';
const page = () => new Response(fixture, { headers: { 'Content-Type': 'text/html' } });
const photo = () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } });
const fetcher = async url => url.includes('acehardware.com') ? page() : photo();
const request = (code, client, method = 'GET') => new Request(`https://signs.example/api/product?item=${code}`, {
  method, headers: { 'CF-Connecting-IP': client },
});

test('reads the exact product, description, price and sale from a public Ace page', () => {
  const product = parseProduct(fixture, item);
  assert.equal(product.name, 'Ace Black 2 gal Bucket');
  assert.equal(product.regularPrice, 4.99);
  assert.equal(product.salePrice, 3.99);
  assert.ok(product.description.length <= 200);
  assert.ok(product.description.endsWith('…'));
  assert.equal(product.priceSource, 'Ace online catalog');
  assert.equal(product.localPriceVerified, false);
  assert.match(product.targetStore, /Keystone Heights/);
  assert.match(product.imageURL, /^https:\/\/cdn-tp6.mozu.com\/24645-/);
});

test('never returns a different SKU or an inactive product', () => {
  assert.throws(() => parseProduct(fixture, '1234567'), /could not be read/);
  assert.throws(() => parseProduct(fixture.replace(/"isActive"\s*:\s*true/, '"isActive":false'), item), /could not be read/);
  assert.throws(() => parseProduct('<html>Changed website</html>', item), /could not be read/);
});

test('handles regular-only, missing, invalid, and non-discounted prices', () => {
  const raw = JSON.parse(fixture.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
  const render = () => `<script id="data-mz-preload-product">${JSON.stringify(raw)}</script>`;
  raw.price.onSale = false;
  assert.equal(parseProduct(render(), item).salePrice, null);
  raw.price.onSale = true;
  raw.price.salePrice = 9.99;
  assert.equal(parseProduct(render(), item).salePrice, null);
  raw.price.price = '4.99';
  assert.equal(parseProduct(render(), item).regularPrice, null);
  delete raw.price;
  assert.equal(parseProduct(render(), item).salePrice, null);
});

test('returns plain text and decodes common catalog entities', () => {
  const raw = JSON.parse(fixture.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1]);
  raw.content.productFullDescription = '<p>Hammer &amp; nail &#39;set&#39;</p><ul><li>Steel</li></ul>';
  const product = parseProduct(`<script type="text/json" id='data-mz-preload-product'>${JSON.stringify(raw)}</script>`, item);
  assert.equal(product.description, "Hammer & nail 'set' Steel");
});

test('restricts photos to Ace tenant images over HTTPS', () => {
  assert.equal(photoURL('https://evil.example/24645-image'), null);
  assert.equal(photoURL('http://cdn-tp6.mozu.com/24645-image'), null);
  assert.equal(photoURL('https://user@cdn-tp6.mozu.com/24645-image'), null);
  assert.equal(photoURL('https://cdn-tp6.mozu.com/another-tenant'), null);
  assert.equal(photoURL('//cdn-tp6.mozu.com/24645-image'), 'https://cdn-tp6.mozu.com/24645-image');
});

test('embeds a photo and never sends credentials or cookies upstream', async () => {
  const calls = [];
  const product = await lookupProduct(item, async (url, options) => {
    calls.push({ url, options });
    return fetcher(url);
  });
  assert.equal(product.photo, 'data:image/jpeg;base64,AQID');
  assert.equal(product.photoUnavailable, false);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://www.acehardware.com/p/1043304');
  for (const { options } of calls) {
    assert.equal(options.redirect, 'manual');
    assert.ok(options.signal);
    assert.deepEqual(Object.keys(options.headers), ['Accept']);
  }
});

test('photo failure keeps usable product text and prices', async () => {
  const product = await lookupProduct(item, async url => url.includes('acehardware.com') ? page() : new Response('Blocked', { status: 403 }));
  assert.equal(product.photo, null);
  assert.equal(product.photoUnavailable, true);
  assert.equal(product.name, 'Ace Black 2 gal Bucket');
  assert.equal(product.regularPrice, 4.99);
});

test('follows a same-host canonical product redirect but rejects other hosts', async () => {
  let count = 0;
  const product = await lookupProduct(item, async url => {
    if (count++ === 0) return new Response(null, { status: 301, headers: { Location: '/departments/product/1043304' } });
    return fetcher(url);
  });
  assert.equal(product.item, item);
  await assert.rejects(lookupProduct(item, async () => new Response(null, { status: 302, headers: { Location: 'https://example.com/private' } })), /unsupported destination/);
});

test('invalid numbers are rejected before any upstream request', async () => {
  for (const code of ['abc', '12', '12345678901', '../1043304', '1043304&x=1']) {
    await assert.rejects(lookupProduct(code, () => assert.fail('should not fetch')), error => error.status === 400);
  }
});

test('not found, access denied, and network errors are actionable', async () => {
  await assert.rejects(lookupProduct(item, async () => new Response(null, { status: 404 })), error => error.status === 404);
  await assert.rejects(lookupProduct(item, async () => new Response(null, { status: 403 })), error => error.code === 'ace_access_denied' && error.upstreamStatus === 403);
  await assert.rejects(lookupProduct(item, async () => { throw new Error('Network down'); }), /timed out or is unavailable/);
});

test('reports upstream failures without returning response bodies or credentials', async () => {
  for (const [status, code, message] of [
    [401, 'ace_access_denied', /denied/],
    [403, 'ace_access_denied', /denied/],
    [429, 'ace_rate_limited', /Wait a minute/],
    [500, 'ace_upstream_error', /Try again later/],
    [503, 'ace_upstream_error', /Try again later/],
  ]) {
    const response = await handleLookup(request(item, `upstream-test-${status}`), {
      fetcher: async () => new Response('Upstream body that must not be exposed', {
        status, headers: { 'Set-Cookie': 'private-session=must-not-return' },
      }),
    });
    assert.equal(response.status, status === 429 ? 503 : 502);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('retry-after'), status === 429 ? '60' : null);
    const body = await response.json();
    assert.equal(body.code, code);
    assert.equal(body.upstreamStatus, status);
    assert.match(body.error, message);
    assert.doesNotMatch(JSON.stringify(body), /must-not-return|must not be exposed/);
  }
});

test('limits page sizes even when content-length is absent', async () => {
  await assert.rejects(lookupProduct(item, async () => new Response('x'.repeat(3_000_001))), /unusually large/);
  await assert.rejects(lookupProduct(item, async () => new Response('', { headers: { 'content-length': '3000001' } })), /unusually large/);
});

test('endpoint validates methods and input, without fetching', async () => {
  const options = { fetcher: () => assert.fail('should not fetch') };
  assert.equal((await handleLookup(request(item, 'method-test', 'POST'), options)).status, 405);
  assert.equal((await handleLookup(request('bad', 'invalid-test'), options)).status, 400);
});

test('endpoint caches successful results and returns them without fetching again', async () => {
  const entries = new Map();
  const pending = [];
  const cache = {
    async match(key) { return entries.get(key.url)?.clone(); },
    async put(key, value) { entries.set(key.url, value); },
  };
  const first = await handleLookup(request(item, 'cache-test'), { fetcher, cache, waitUntil: p => pending.push(p) });
  assert.equal(first.status, 200);
  assert.match(first.headers.get('cache-control'), /s-maxage=900/);
  await Promise.all(pending);
  const second = await handleLookup(request(item, 'cache-test'), { cache, fetcher: () => assert.fail('must use cached result') });
  assert.equal((await second.json()).name, 'Ace Black 2 gal Bucket');
});

test('limits uncached lookups per client and recovers after the cooldown', async () => {
  let time = 100;
  const options = { fetcher, now: () => time };
  assert.equal((await handleLookup(request(item, 'cooldown-test'), options)).status, 200);
  const limited = await handleLookup(request(item, 'cooldown-test'), options);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '5');
  time += 5000;
  assert.equal((await handleLookup(request(item, 'cooldown-test'), options)).status, 200);
});

test('cache failures do not prevent a usable lookup result', async () => {
  const pending = [];
  const cache = { async match() { throw new Error('Unavailable'); }, async put() { throw new Error('Unavailable'); } };
  const response = await handleLookup(request(item, 'cache-failure-test'), { fetcher, cache, waitUntil: p => pending.push(p) });
  assert.equal(response.status, 200);
  await Promise.all(pending);
});
