export const MAX_PHOTO_BYTES = 6_000_000;
const imageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];

export function pictureURL(value) {
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Enter a direct picture link starting with https://.'); }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Use an https:// picture link without a username or password.');
  }
  return url;
}

export async function fetchPicture(value, signal) {
  const url = pictureURL(value);
  // Ace's image host lacks browser CORS headers. Only its public image tenant
  // uses our server endpoint; other hosts must allow browser image downloads.
  const acePhoto = !url.port && /^cdn-tp[1-6]\.mozu\.com$/.test(url.hostname) && url.pathname.startsWith('/24645-');
  let response;
  try {
    response = await fetch(acePhoto ? `/api/photo?url=${encodeURIComponent(url.href)}` : url.href, {
      signal, credentials: 'omit', referrerPolicy: 'no-referrer',
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('This website could not share the picture. Copy the picture itself and paste it below, or choose a saved image file.');
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error('The picture could not be downloaded. Paste the picture itself or choose a saved image file.');
  }
  const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!imageTypes.includes(type)) {
    await response.body?.cancel();
    throw new Error('Use a direct PNG, JPG, WebP, GIF, or AVIF picture link, rather than a product page.');
  }
  if (Number(response.headers.get('content-length')) > MAX_PHOTO_BYTES) {
    await response.body?.cancel();
    throw new Error('Choose a picture smaller than 6 MB.');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The picture was empty. Choose another picture.');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_PHOTO_BYTES) throw new Error('Choose a picture smaller than 6 MB.');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return new Blob(chunks, { type });
}

export async function monochromePicture(blob) {
  if (!imageTypes.includes(blob.type.toLowerCase())) throw new Error('Choose a PNG, JPG, WebP, GIF, or AVIF picture.');
  if (blob.size > MAX_PHOTO_BYTES) throw new Error('Choose a picture smaller than 6 MB.');
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); } catch { throw new Error('This picture could not be read. Choose another image file.'); }
    if (image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('Choose a smaller picture, under 40 megapixels.');
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.filter = 'grayscale(1)';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally { URL.revokeObjectURL(url); }
}
