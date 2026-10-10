import test from 'node:test';
import assert from 'node:assert/strict';
import { handlePhoto } from '../worker/photo.js';
import { pictureURL } from '../sign-photo.js';

const imageURL = 'https://cdn-tp6.mozu.com/24645-37138/cms/37138/files/example';
const request = (url = imageURL, options) => new Request(`https://signs.example/api/photo?url=${encodeURIComponent(url)}`, options);

test('picture URLs require HTTPS and reject embedded credentials', () => {
  assert.equal(pictureURL(' https://images.example/picture.png ').href, 'https://images.example/picture.png');
  for (const value of ['not a URL', 'http://images.example/pic', 'data:image/png;base64,AAAA', 'https://user:secret@images.example/pic']) {
    assert.throws(() => pictureURL(value));
  }
});

test('photo endpoint rejects unsupported hosts, tenants, credentials, schemes, and methods without fetching', async () => {
  const fetcher = () => { throw new Error('Unexpected request'); };
  for (const url of ['https://127.0.0.1/24645-test', 'https://images.example/test.png', 'https://cdn-tp6.mozu.com/99999-test', 'https://cdn-tp6.mozu.com.evil.example/24645-test', 'https://user:secret@cdn-tp6.mozu.com/24645-test', 'http://cdn-tp6.mozu.com/24645-test', '//cdn-tp6.mozu.com/24645-test', 'https://cdn-tp6.mozu.com:8443/24645-test']) {
    assert.equal((await handlePhoto(request(url), { fetcher })).status, 400);
  }
  const response = await handlePhoto(request(imageURL, { method: 'POST' }), { fetcher });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET');
});

test('photo endpoint returns bounded image bytes without forwarding browser credentials', async () => {
  const bytes = new Uint8Array([137, 80, 78, 71]);
  const response = await handlePhoto(request(imageURL, { headers: { Cookie: 'private-cookie', Authorization: 'private-token' } }), {
    fetcher: async (url, options) => {
      assert.equal(url, imageURL);
      assert.equal(options.redirect, 'manual');
      assert.equal(options.headers.Cookie, undefined);
      assert.equal(options.headers.Authorization, undefined);
      return new Response(bytes, { headers: { 'Content-Type': 'image/png' } });
    },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
});

test('photo endpoint rejects redirected private hosts, other tenants, and credential-bearing redirects', async () => {
  for (const location of ['https://127.0.0.1/private', 'https://user:secret@cdn-tp6.mozu.com/24645-test', 'https://cdn-tp6.mozu.com/99999-test']) {
    let calls = 0;
    const response = await handlePhoto(request(), { fetcher: async () => {
      calls++;
      return new Response(null, { status: 302, headers: { Location: location } });
    } });
    assert.equal(response.status, 502);
    assert.equal(calls, 1);
  }
});

test('photo endpoint follows a redirect within the approved image tenant', async () => {
  let calls = 0;
  const response = await handlePhoto(request(), { fetcher: async url => {
    calls++;
    if (calls === 1) return new Response(null, { status: 302, headers: { Location: '/24645-37138/cms/picture.png' } });
    assert.equal(url, 'https://cdn-tp6.mozu.com/24645-37138/cms/picture.png');
    return new Response('picture bytes', { headers: { 'Content-Type': 'image/png' } });
  } });
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test('photo failures expose no upstream body and reject non-images or oversized responses', async () => {
  for (const upstream of [
    new Response('private error body', { status: 403 }),
    new Response('<html>product page</html>', { headers: { 'Content-Type': 'text/html' } }),
    new Response('image', { headers: { 'Content-Type': 'image/png', 'Content-Length': '6000001' } }),
    new Response(new Uint8Array(6_000_001), { headers: { 'Content-Type': 'image/png' } }),
  ]) {
    const response = await handlePhoto(request(), { fetcher: async () => upstream });
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /private error body|<html>/);
  }
});
