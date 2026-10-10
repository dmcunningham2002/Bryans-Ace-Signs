import './style.css';
import { jsPDF } from 'jspdf';
import { layouts, renderSheet } from './sign-layout.js';

const arrow = '↗';
document.querySelector('#app').innerHTML = `
<header><a class="brand" href="./"><span class="brand-icon">A<span>✦</span></span><span>BRIAN'S ACE<span class="brand-sub">SIGN MAKER</span></span></a><div class="header-note"><span class="status-dot"></span> MADE FOR YOUR STORE</div></header>
<main><div class="intro"><div class="eyebrow">A GOOD DEAL DESERVES A GOOD SIGN</div><h1>Big savings.<br>Clear signs.</h1><p>Create clear signs for sales and everyday prices.<br>Choose your layout. Preview it. Print it.</p></div>
<div class="workspace"><section class="editor"><div class="section-heading"><span class="step">01</span><h2>Make it yours</h2></div><p class="section-description">Look up an Ace item, or enter your details below.</p>
<form id="details" novalidate><fieldset class="layout-picker"><legend>Signs per page</legend><div class="layout-options"><label class="layout-option"><input type="radio" name="layout" value="full" checked><span class="layout-icon single">▭</span><strong>Full page</strong><small>1 large sign</small></label><label class="layout-option"><input type="radio" name="layout" value="two"><span class="layout-icon double">▭<br>▭</span><strong>2 per page</strong><small>2 wide signs</small></label><label class="layout-option"><input type="radio" name="layout" value="four"><span class="layout-icon quad">▭ ▭<br>▭ ▭</span><strong>4 per page</strong><small>4 small signs</small></label></div></fieldset><fieldset class="sign-picker" id="sign-picker" hidden><legend>Edit each sign</legend><div class="sign-tabs"><button type="button" class="sign-tab" data-slot="0" aria-pressed="false">Sign 1</button><button type="button" class="sign-tab" data-slot="1" aria-pressed="false">Sign 2</button><button type="button" class="sign-tab" data-slot="2" aria-pressed="false">Sign 3</button><button type="button" class="sign-tab" data-slot="3" aria-pressed="false">Sign 4</button></div></fieldset><div class="active-sign-heading"><strong id="active-sign-label" aria-live="polite">Sign 1</strong><button type="button" id="copy-sign" hidden>Copy to all</button></div><label for="item">Ace item number <span>LOOK UP OR ENTER MANUALLY</span></label><div class="lookup-row"><input id="item" name="item" placeholder="e.g. 1043304" maxlength="30" inputmode="numeric"><button type="button" id="lookup">Look up item</button></div><p class="lookup-status" id="lookup-status" role="status" aria-live="polite"></p><a id="source-link" class="source-link" target="_blank" rel="noopener noreferrer" hidden>View item on Ace ↗</a><label for="product">Product name</label><input id="product" name="product" value="Premium Interior Paint" placeholder="e.g. Premium Interior Paint" maxlength="90" required><label for="description">Short description <span>OPTIONAL</span></label><textarea id="description" name="description" placeholder="A few helpful product details" maxlength="200" rows="3"></textarea><div class="photo-controls" id="photo-controls" hidden><img id="photo-thumbnail" alt="Product photo"><label><input type="checkbox" id="include-photo" checked> Include photo on sign</label></div><fieldset class="sign-type-picker"><legend>Sign type</legend><div class="sign-type-options"><label class="sign-type-option"><input type="radio" name="signType" value="sale" checked><span>Sale sign</span></label><label class="sign-type-option"><input type="radio" name="signType" value="regular"><span>Regular price</span></label></div></fieldset><div class="price-fields" id="price-fields"><div><label for="regular">Regular price</label><div class="currency"><span>$</span><input id="regular" name="regular" type="number" min="0.01" max="999999.99" step="0.01" value="39.99" required></div></div><div id="sale-price-field"><label for="sale">Sale price</label><div class="currency"><span>$</span><input id="sale" name="sale" type="number" min="0" max="999999.99" step="0.01" value="29.99" required></div></div></div><fieldset class="promotion-dates" id="promotion-dates"><legend>Promotion dates <span>OPTIONAL</span></legend><div class="date-fields"><div><label for="start-date">Starts on</label><input id="start-date" name="startDate" type="date" max="9999-12-31"></div><div><label for="end-date">Ends on</label><input id="end-date" name="endDate" type="date" max="9999-12-31"></div></div><p class="date-note">Dates appear on your sign. Leave blank for no dates.</p></fieldset><p class="error" id="error" aria-live="polite"></p><div class="format"><span class="paper-icon">▤</span><div><strong id="format-title"></strong><small id="format-description"></small></div><span class="check">✓</span></div><p class="layout-note">Each sign has its own details. Multi-sign sheets include cut guides.</p><button type="submit" class="primary"><span>↓ &nbsp; Download PDF</span><span>${arrow}</span></button><button type="button" class="secondary" id="print">▤ &nbsp; Print sheet</button><p class="footnote">Ready to print. No color ink needed.</p></form></section>
<section class="preview-area"><div class="preview-heading"><div class="section-heading"><span class="step">02</span><h2>Your sign, live</h2></div><span class="live"><span class="status-dot"></span> LIVE PREVIEW</span></div><div class="paper-stage"><div id="sheet-preview" aria-live="polite"></div></div><div class="preview-caption"><span>↑ &nbsp; Preview of your whole printed sheet.</span><span>100% BLACK & WHITE</span></div></section></div>
<div class="how"><span class="eyebrow">FROM DETAILS TO DISPLAY</span><div><span>01</span> Add your product</div><span class="flow-arrow">→</span><div><span>02</span> Check your sign</div><span class="flow-arrow">→</span><div><span>03</span> Print & put it up</div></div></main><footer><span>Brian's Ace Sign Maker</span><span>Simple signs. Standout savings.</span></footer>`;
const form = document.querySelector('#details');
const error = document.querySelector('#error');
const downloadButton = form.querySelector('.primary');
const printButton = document.querySelector('#print');
const lookupButton = document.querySelector('#lookup');
const lookupStatus = document.querySelector('#lookup-status');
let productPhoto = null;
let lookupRequest = null;
const fields = ['product', 'item', 'description', 'regular', 'sale', 'startDate', 'endDate'];
const signs = Array.from({ length: 4 }, () => ({
  product: '', item: '', description: '', regular: '', sale: '',
  startDate: '', endDate: '', signType: 'sale', photo: null,
  includePhoto: true, lookupStatus: '',
}));
let activeSign = 0;
const printStyle = document.createElement('style');
document.head.append(printStyle);

function saveActive() {
  const entry = signs[activeSign];
  for (const field of fields) entry[field] = form.elements.namedItem(field).value;
  entry.signType = form.elements.signType.value;
  entry.photo = productPhoto;
  entry.includePhoto = document.querySelector('#include-photo').checked;
  entry.lookupStatus = lookupStatus.textContent;
}
function data(index = activeSign) {
  const entry = signs[index];
  return {
    product: entry.product.trim(), item: entry.item.trim(),
    regular: entry.regular === '' ? NaN : Number(entry.regular),
    sale: entry.sale === '' ? NaN : Number(entry.sale),
    signType: entry.signType, startDate: entry.startDate, endDate: entry.endDate,
    description: entry.description.trim(), photo: entry.includePhoto ? entry.photo : null,
  };
}
function layoutKey() { return form.elements.layout.value; }
function sheetData() { return signs.slice(0, layouts[layoutKey()].count).map((_, index) => data(index)); }
function positionLabel(index) {
  if (layoutKey() === 'two') return ['Top', 'Bottom'][index];
  if (layoutKey() === 'four') return ['Top left', 'Top right', 'Bottom left', 'Bottom right'][index];
  return 'Full page';
}
function cancelLookup() {
  if (lookupRequest) {
    lookupRequest.abort();
    lookupRequest = null;
    lookupStatus.textContent = '';
  }
  lookupButton.disabled = false;
  lookupButton.textContent = 'Look up item';
}
function selectSign(index) {
  cancelLookup();
  saveActive();
  activeSign = index;
  const entry = signs[index];
  for (const field of fields) form.elements.namedItem(field).value = entry[field];
  form.querySelector(`input[name="signType"][value="${entry.signType}"]`).checked = true;
  productPhoto = entry.photo;
  document.querySelector('#include-photo').checked = entry.includePhoto;
  document.querySelector('#photo-controls').hidden = !productPhoto;
  if (productPhoto) document.querySelector('#photo-thumbnail').src = productPhoto;
  lookupStatus.textContent = entry.lookupStatus;
  update();
}
function update() {
  saveActive();
  const key = layoutKey();
  const layout = layouts[key];
  const values = data();
  const isSale = values.signType === 'sale';
  document.querySelector('#sale-price-field').hidden = !isSale;
  document.querySelector('#price-fields').classList.toggle('regular-only', !isSale);
  form.elements.sale.disabled = !isSale;
  form.elements.sale.required = isSale;
  document.querySelector('#promotion-dates').hidden = !isSale;
  form.elements.startDate.disabled = !isSale;
  form.elements.endDate.disabled = !isSale;
  document.querySelector('#sheet-preview').innerHTML = renderSheet(sheetData(), key);
  document.querySelector('#sign-picker').hidden = layout.count === 1;
  document.querySelector('#copy-sign').hidden = layout.count === 1;
  document.querySelector('#active-sign-label').textContent = `Sign ${activeSign + 1} · ${positionLabel(activeSign)}`;
  for (const button of document.querySelectorAll('.sign-tab')) {
    const index = Number(button.dataset.slot);
    button.hidden = index >= layout.count;
    button.setAttribute('aria-pressed', String(index === activeSign));
    button.textContent = `Sign ${index + 1}`;
    button.setAttribute('aria-label', `Edit sign ${index + 1}, ${positionLabel(index) || ''}`);
  }
  const source = document.querySelector('#source-link');
  source.hidden = !/^\d{4,10}$/.test(values.item);
  if (!source.hidden) source.href = `https://www.acehardware.com/p/${values.item}`;
  document.querySelector('.layout-note').textContent = layout.count === 1
    ? 'One large landscape sign.'
    : 'Choose a sign number to edit that position. Copy to all repeats the current sign.';
  document.querySelector('#format-title').textContent = `${layout.label} · Landscape signs`;
  document.querySelector('#format-description').textContent = `US Letter · ${layout.width} × ${layout.height} in · ${layout.orientation} sheet`;
  printStyle.textContent = `@page { size: ${layout.width}in ${layout.height}in; margin: 0; } @media print { .print-sheet { width: ${layout.width}in; height: ${layout.height}in; } }`;
  error.textContent = '';
}
function valid() {
  saveActive();
  const cents = value => Math.abs(value * 100 - Math.round(value * 100)) < .000001;
  for (let index = 0; index < layouts[layoutKey()].count; index++) {
    const values = data(index);
    let message, field;
    if (!values.product) { message = 'Please enter a product name.'; field = 'product'; }
    else if (!Number.isFinite(values.regular) || values.regular < .01 || values.regular > 999999.99 || !cents(values.regular)) {
      message = 'Enter a regular price from $0.01 to $999,999.99 with at most two decimal places.'; field = 'regular';
    } else if (values.signType === 'sale' && (!Number.isFinite(values.sale) || values.sale < 0 || values.sale > 999999.99 || !cents(values.sale))) {
      message = 'Enter a sale price with at most two decimal places.'; field = 'sale';
    } else if (values.signType === 'sale' && values.sale >= values.regular) {
      message = 'Sale price must be lower than the regular price.'; field = 'sale';
    } else if (values.signType === 'sale' && [values.startDate, values.endDate].some(date => date && Number(date.split('-')[0]) > 9999)) {
      message = 'Enter promotion dates on or before December 31, 9999.'; field = 'endDate';
    } else if (values.signType === 'sale' && values.startDate && values.endDate && values.endDate < values.startDate) {
      message = 'Promotion end date must be on or after the start date.'; field = 'endDate';
    }
    if (message) {
      selectSign(index);
      error.textContent = `Sign ${index + 1}: ${message}`;
      form.elements.namedItem(field).focus();
      return false;
    }
  }
  return form.reportValidity();
}

async function downloadPDF(values, key) {
  const layout = layouts[key];
  const svg = renderSheet(values, key);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    // 300 dpi keeps the logo and small signs crisp on a printed Letter sheet.
    canvas.width = layout.width * 300;
    canvas.height = layout.height * 300;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pdf = new jsPDF({ unit: 'in', format: 'letter', orientation: layout.orientation });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, layout.width, layout.height, undefined, 'FAST');
    const filename = layout.count > 1 ? 'brians-ace-signs'
      : values[0].product.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'sign';
    pdf.save(`${filename}-${layout.count}-per-page.pdf`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function resetLookup() {
  cancelLookup();
  productPhoto = null;
  document.querySelector('#photo-controls').hidden = true;
  document.querySelector('#source-link').hidden = true;
  lookupStatus.textContent = '';
}

async function monochromePhoto(source) {
  if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(source)) return null;
  const image = new Image();
  image.src = source;
  await image.decode();
  const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.filter = 'grayscale(1)';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

async function lookUpItem() {
  const slot = activeSign;
  const item = form.elements.namedItem('item').value.trim();
  if (!/^\d{4,10}$/.test(item)) {
    lookupStatus.textContent = 'Enter an Ace item number containing 4–10 digits.';
    return;
  }
  lookupRequest?.abort();
  const controller = new AbortController();
  lookupRequest = controller;
  lookupButton.disabled = true;
  lookupButton.textContent = 'Looking up…';
  lookupStatus.textContent = 'Getting product details from Ace…';
  const source = document.querySelector('#source-link');
  source.href = `https://www.acehardware.com/p/${item}`;
  source.hidden = false;
  try {
    const response = await fetch(`/api/product?item=${encodeURIComponent(item)}`, { signal: controller.signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Lookup is unavailable. You can still enter details manually.');
    if (result.item !== item || typeof result.name !== 'string') throw new Error('Ace returned unexpected details. Please enter them manually.');
    let photo = null;
    if (result.photo) {
      try { photo = await monochromePhoto(result.photo); } catch { /* Keep usable text and price if an image cannot load. */ }
    }
    if (controller.signal.aborted || activeSign !== slot || form.elements.namedItem('item').value.trim() !== item) return;
    productPhoto = photo;
    form.elements.product.value = result.name.slice(0, 90);
    form.elements.description.value = (result.description || '').slice(0, 200);
    form.elements.regular.value = result.regularPrice ? Number(result.regularPrice).toFixed(2) : '';
    form.elements.sale.value = result.salePrice ? Number(result.salePrice).toFixed(2) : '';
    const type = result.salePrice ? 'sale' : 'regular';
    form.querySelector(`input[name="signType"][value="${type}"]`).checked = true;
    // Do not carry a previous product's promotion dates into a new item's sign.
    form.elements.startDate.value = '';
    form.elements.endDate.value = '';
    document.querySelector('#include-photo').checked = true;
    document.querySelector('#photo-controls').hidden = !photo;
    if (photo) document.querySelector('#photo-thumbnail').src = photo;
    lookupStatus.textContent = 'Item loaded. Ace online prices are shown; confirm Keystone Heights pricing before printing.' +
      (!result.regularPrice ? ' No price was available—enter your store price.' : '') +
      (!photo ? ' No photo was available.' : '');
    update();
  } catch (error) {
    if (!controller.signal.aborted) lookupStatus.textContent = error instanceof SyntaxError ? 'Lookup is unavailable. You can still enter details manually.' : error.message;
  } finally {
    if (lookupRequest === controller) {
      lookupButton.disabled = false;
      lookupButton.textContent = 'Look up item';
      lookupRequest = null;
    }
  }
}
lookupButton.addEventListener('click', lookUpItem);
for (const button of document.querySelectorAll('.sign-tab')) {
  button.addEventListener('click', () => selectSign(Number(button.dataset.slot)));
}
document.querySelector('#copy-sign').addEventListener('click', () => {
  cancelLookup();
  saveActive();
  const source = { ...signs[activeSign] };
  for (let index = 0; index < layouts[layoutKey()].count; index++) signs[index] = { ...source };
  update();
});
form.elements.namedItem('item').addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); if (!lookupButton.disabled) lookUpItem(); }
});
form.addEventListener('input', event => {
  if (event.target === form.elements.namedItem('item')) resetLookup();
  if (event.target.name === 'layout' && activeSign >= layouts[layoutKey()].count) {
    selectSign(0);
    return;
  }
  update();
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!valid()) return;
  downloadButton.disabled = true;
  printButton.disabled = true;
  const label = downloadButton.innerHTML;
  downloadButton.textContent = 'Preparing your PDF…';
  try { await downloadPDF(sheetData(), layoutKey()); }
  catch { error.textContent = 'Could not create your PDF. Please try again.'; }
  finally {
    downloadButton.innerHTML = label;
    downloadButton.disabled = false;
    printButton.disabled = false;
  }
});
printButton.addEventListener('click', () => { if (valid()) window.print(); });
update();
