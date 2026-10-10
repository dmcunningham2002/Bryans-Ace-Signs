import storeLogo from './public/bryans-ace-hardware-logo.svg?raw';

// All outputs use this same SVG sheet: live preview, print, and downloaded PDF.
export const layouts = {
  full: { count: 1, columns: 1, rows: 1, width: 11, height: 8.5, label: 'Full page', orientation: 'landscape' },
  two: { count: 2, columns: 1, rows: 2, width: 8.5, height: 11, label: '2 per page', orientation: 'portrait' },
  four: { count: 4, columns: 2, rows: 2, width: 11, height: 8.5, label: '4 per page', orientation: 'landscape' },
};

const measure = document.createElement('canvas').getContext('2d');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const money = value => '$' + value.toFixed(2);
function width(text, size, weight = 'bold') {
  measure.font = `${weight} ${size}px Arial`;
  return measure.measureText(text).width;
}
function fit(text, maxWidth, initial, minimum = 18) {
  let size = initial;
  while (size > minimum && width(text, size) > maxWidth) size--;
  return size;
}
function wrap(text, maxWidth, size) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (let word of words) {
    if (line && width(`${line} ${word}`, size) > maxWidth) { lines.push(line); line = ''; }
    while (width(word, size) > maxWidth) {
      // Break long item descriptions even when they contain no spaces.
      let length = 1;
      while (length < word.length && width(word.slice(0, length + 1), size) <= maxWidth) length++;
      lines.push(word.slice(0, length));
      word = word.slice(length);
    }
    line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
function text(content, x, y, size, extra = '') {
  return `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${escape(content)}</text>`;
}
const logoArtwork = storeLogo.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];

function formatDate(value) {
  // Date inputs are calendar dates; format directly without timezone conversion.
  const [year, month, day] = value.split('-');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[Number(month) - 1]} ${Number(day)}, ${year}`;
}
function promotionCaption(data) {
  if (data.startDate && data.endDate) return `VALID ${formatDate(data.startDate)} – ${formatDate(data.endDate)}`;
  if (data.endDate) return `SALE ENDS ${formatDate(data.endDate)}`;
  if (data.startDate) return `SALE STARTS ${formatDate(data.startDate)}`;
  return 'GREAT FINDS. EVEN BETTER PRICES.';
}

function sign(data, height, index) {
  const isSale = data.signType !== 'regular';
  const padding = 42;
  const divider = 557;
  const productCenter = divider / 2;
  const productWidth = divider - padding * 2;
  const middle = (174 + height - 168) / 2;
  let titleSize = 66;
  let lines = wrap(data.product || 'Your product name', productWidth, titleSize);
  while ((lines.length * titleSize * 1.12 > height - 335 || lines.length > 4) && titleSize > 24) {
    lines = wrap(data.product || 'Your product name', productWidth, --titleSize);
  }
  const start = middle - (lines.length - 1) * titleSize * 1.12 / 2 + titleSize * .32;
  const price = money(isSale ? data.sale : data.regular);
  const priceSize = fit(price, 350, 116, 40);
  const regular = `REG. ${money(data.regular)}`;
  const savings = data.regular > data.sale ? `SAVE ${money(data.regular - data.sale)}` : 'EVERYDAY VALUE';
  const caption = isSale ? promotionCaption(data) : 'THE RIGHT PRICE. RIGHT HERE.';
  const item = data.item ? `ACE ITEM # ${data.item}` : '';
  return `<g class="sale-sign" data-sign="${index}" font-family="Arial, Helvetica, sans-serif" fill="#000">
    <rect x="1" y="1" width="998" height="${height - 2}" fill="#fff" stroke="#000" stroke-width="2"/>
    <svg class="store-logo" x="${padding}" y="36" width="300" height="75" viewBox="0 0 400 100">${logoArtwork}</svg>
    ${text('THE HELPFUL PLACE.', 375, 83, 15, 'font-weight="bold" letter-spacing="1"')}
    <rect x="748" y="36" width="210" height="77" fill="#000"/>
    ${text(isSale ? 'SALE' : 'PRICE', 853, 93, isSale ? 56 : 46, 'fill="#fff" text-anchor="middle" font-weight="900" letter-spacing="3"')}
    <line x1="${padding}" y1="140" x2="958" y2="140" stroke="#000" stroke-width="2"/>
    ${lines.map((line, i) => text(line, productCenter, start + i * titleSize * 1.12, titleSize, 'class="product-line" text-anchor="middle" font-weight="bold"')).join('')}
    ${text(item, productCenter, height - 136, fit(item, productWidth - item.length * .5, 28, 12), 'class="item-line" text-anchor="middle" font-weight="bold" letter-spacing=".5"')}
    <line x1="${divider}" y1="183" x2="${divider}" y2="${height - 126}" stroke="#000" stroke-width="1"/>
    ${text(isSale ? 'SALE PRICE' : 'REGULAR PRICE', 759, middle - 72, 17, 'text-anchor="middle" font-weight="bold" letter-spacing="2"')}
    ${text(price, 759, middle + 43, priceSize, 'class="price-line" text-anchor="middle" font-weight="bold" letter-spacing="-3"')}
    ${isSale ? `${text(regular, 759, middle + 90, 23, 'text-anchor="middle"')}
    <rect x="614" y="${middle + 115}" width="290" height="52" fill="#000"/>
    ${text(savings, 759, middle + 150, fit(savings, 266, 28), 'class="savings-line" fill="#fff" text-anchor="middle" font-weight="bold"')}` : ''}
    <line x1="${padding}" y1="${height - 85}" x2="958" y2="${height - 85}" stroke="#000" stroke-width="2"/>
    ${text(caption, 500, height - 42, fit(caption, 830, 20), 'class="promotion-caption" text-anchor="middle" font-weight="bold" letter-spacing="1"')}
  </g>`;
}

export function renderSheet(data, key) {
  const layout = layouts[key];
  const pageWidth = layout.width * 100;
  const pageHeight = layout.height * 100;
  const margin = 30; // 0.3 in printer-safe margins.
  const gap = layout.count > 1 ? 20 : 0;
  const signWidth = (pageWidth - margin * 2 - gap * (layout.columns - 1)) / layout.columns;
  const signHeight = (pageHeight - margin * 2 - gap * (layout.rows - 1)) / layout.rows;
  const scale = signWidth / 1000;
  let content = '';
  for (let i = 0; i < layout.count; i++) {
    const x = margin + (i % layout.columns) * (signWidth + gap);
    const y = margin + Math.floor(i / layout.columns) * (signHeight + gap);
    content += `<g transform="translate(${x} ${y}) scale(${scale})">${sign(data, signHeight / scale, i)}</g>`;
  }
  // Cut guides live in the gutters, outside each sign.
  if (layout.rows > 1) content += `<line x1="15" y1="${pageHeight / 2}" x2="${pageWidth - 15}" y2="${pageHeight / 2}" stroke="#999" stroke-width=".6" stroke-dasharray="4 5"/>`;
  if (layout.columns > 1) content += `<line x1="${pageWidth / 2}" y1="15" x2="${pageWidth / 2}" y2="${pageHeight - 15}" stroke="#999" stroke-width=".6" stroke-dasharray="4 5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="print-sheet" role="img" aria-label="${layout.label} ${data.signType === 'regular' ? 'regular-price' : 'sale'} sign preview" viewBox="0 0 ${pageWidth} ${pageHeight}" width="${pageWidth}" height="${pageHeight}"><rect width="${pageWidth}" height="${pageHeight}" fill="#fff"/>${content}</svg>`;
}
