const ACE_ORIGIN = 'https://www.acehardware.com';
export const TARGET_STORE = "Bryan's Ace Hardware · Keystone Heights";

export class LookupError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

function plainText(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
    if (entity.startsWith('#')) {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[entity.toLowerCase()];
  }).replace(/\s+/g, ' ').trim();
}

function amount(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 999999.99
    ? Math.round(value * 100) / 100 : null;
}

export function photoURL(value) {
  if (!value) return null;
  try {
    const url = new URL(value, ACE_ORIGIN);
    // Only fetch Ace's own tenant on its published image CDN. This is not an open image proxy.
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !/^cdn-tp[1-6]\.mozu\.com$/.test(url.hostname) || !url.pathname.startsWith('/24645-')) return null;
    return url.href;
  } catch { return null; }
}

export function parseProduct(html, item) {
  let product;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (!/\bid\s*=\s*["']data-mz-preload-product["']/i.test(match[1])) continue;
    try {
      const candidate = JSON.parse(match[2]);
      if (String(candidate.productCode) === item) { product = candidate; break; }
    } catch { /* A changed or incomplete page is handled below. */ }
  }
  if (!product || !product.content || product.isActive === false) {
    throw new LookupError('This item could not be read from Ace. Check the item number or enter its details manually.', 404);
  }
  const name = plainText(product.content.productName);
  if (!name) throw new LookupError('Ace returned an item without a product name. Please enter the details manually.');
  const fullDescription = plainText(product.content.productFullDescription || product.content.productShortDescription);
  const regular = amount(product.price?.price);
  const sale = product.price?.onSale ? amount(product.price.salePrice) : null;
  const image = product.content.productImages?.find(image => photoURL(image.imageUrl || image.src));
  return {
    item,
    name,
    description: fullDescription.length > 200 ? fullDescription.slice(0, 197).trimEnd() + '…' : fullDescription,
    regularPrice: regular,
    salePrice: regular && sale && sale < regular ? sale : null,
    imageURL: image ? photoURL(image.imageUrl || image.src) : null,
    // These page prices have a CORP catalog scope. They are never claimed to be verified local prices.
    priceSource: 'Ace online catalog',
    localPriceVerified: false,
    targetStore: TARGET_STORE,
    sourceURL: `${ACE_ORIGIN}/p/${item}`,
  };
}

async function readLimited(response, maxBytes) {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel();
    throw new LookupError('Ace returned an unusually large response. Please try again later.');
  }
  if (!response.body) throw new LookupError('Ace returned an empty response. Please enter the details manually.');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) throw new LookupError('Ace returned an unusually large response. Please try again later.');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

async function request(url, fetcher) {
  // Follow only redirects within the original host; do not forward cookies or authorization.
  const original = new URL(url);
  const signal = AbortSignal.timeout(12000);
  for (let redirects = 0; redirects < 4; redirects++) {
    const response = await fetcher(url, {
      redirect: 'manual', signal,
      headers: { Accept: original.hostname === 'www.acehardware.com' ? 'text/html' : 'image/png,image/jpeg,image/webp' },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const next = new URL(response.headers.get('location') || '', url);
      if (!response.headers.get('location') || next.protocol !== 'https:' || next.host !== original.host) {
        await response.body?.cancel();
        throw new LookupError('Ace redirected this item to an unsupported destination. Enter its details manually.');
      }
      await response.body?.cancel();
      url = next.href;
      continue;
    }
    return response;
  }
  throw new LookupError('Ace redirected this item too many times. Please enter its details manually.');
}

export async function lookupProduct(item, fetcher = fetch) {
  if (!/^\d{4,10}$/.test(item)) throw new LookupError('Enter an Ace item number containing 4–10 digits.', 400);
  let response;
  try { response = await request(`${ACE_ORIGIN}/p/${item}`, fetcher); }
  catch (error) { throw error instanceof LookupError ? error : new LookupError('Ace lookup timed out or is unavailable. Please try again or enter the details manually.'); }
  if (response.status === 404) {
    await response.body?.cancel();
    throw new LookupError('Item not found on Ace’s website. Check the number or enter the details manually.', 404);
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new LookupError('Ace is not accepting product lookups right now. You can still enter the details manually.');
  }
  const product = parseProduct(new TextDecoder().decode(await readLimited(response, 3_000_000)), item);
  let photo = null;
  if (product.imageURL) {
    try {
      const image = await request(product.imageURL, fetcher);
      const mime = image.headers.get('content-type')?.split(';')[0].toLowerCase();
      if (!image.ok || !['image/png', 'image/jpeg', 'image/webp'].includes(mime)) {
        await image.body?.cancel();
        throw new Error('Unsupported image');
      }
      const bytes = await readLimited(image, 3_000_000);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      photo = `data:${mime};base64,${btoa(binary)}`;
    } catch { /* A missing photo does not discard valid product information. */ }
  }
  const { imageURL, ...details } = product;
  return { ...details, photo, photoUnavailable: Boolean(imageURL && !photo), retrievedAt: new Date().toISOString() };
}
