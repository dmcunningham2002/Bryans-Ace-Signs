import './style.css';
import { jsPDF } from 'jspdf';
import { layouts, renderSheet } from './sign-layout.js';

const arrow = '↗';
document.querySelector('#app').innerHTML = `
<header><a class="brand" href="./"><span class="brand-icon">A<span>✦</span></span><span>BRIAN'S ACE<span class="brand-sub">SIGN MAKER</span></span></a><div class="header-note"><span class="status-dot"></span> MADE FOR YOUR STORE</div></header>
<main><div class="intro"><div class="eyebrow">A GOOD DEAL DESERVES A GOOD SIGN</div><h1>Big savings.<br>Clear signs.</h1><p>Create clear signs for sales and everyday prices.<br>Choose your layout. Preview it. Print it.</p></div>
<div class="workspace"><section class="editor"><div class="section-heading"><span class="step">01</span><h2>Make it yours</h2></div><p class="section-description">Enter your product and pricing details below.</p>
<form id="details"><label for="product">Product name</label><input id="product" name="product" value="Premium Interior Paint" placeholder="e.g. Premium Interior Paint" maxlength="90" required><label for="item">Ace item number <span>OPTIONAL</span></label><input id="item" name="item" value="1023456" placeholder="e.g. 1023456" maxlength="30"><fieldset class="sign-type-picker"><legend>Sign type</legend><div class="sign-type-options"><label class="sign-type-option"><input type="radio" name="signType" value="sale" checked><span>Sale sign</span></label><label class="sign-type-option"><input type="radio" name="signType" value="regular"><span>Regular price</span></label></div></fieldset><div class="price-fields" id="price-fields"><div><label for="regular">Regular price</label><div class="currency"><span>$</span><input id="regular" name="regular" type="number" min="0.01" max="999999.99" step="0.01" value="39.99" required></div></div><div id="sale-price-field"><label for="sale">Sale price</label><div class="currency"><span>$</span><input id="sale" name="sale" type="number" min="0" max="999999.99" step="0.01" value="29.99" required></div></div></div><fieldset class="promotion-dates" id="promotion-dates"><legend>Promotion dates <span>OPTIONAL</span></legend><div class="date-fields"><div><label for="start-date">Starts on</label><input id="start-date" name="startDate" type="date" max="9999-12-31"></div><div><label for="end-date">Ends on</label><input id="end-date" name="endDate" type="date" max="9999-12-31"></div></div><p class="date-note">Dates appear on your sign. Leave blank for no dates.</p></fieldset><p class="error" id="error" aria-live="polite"></p><fieldset class="layout-picker"><legend>Signs per page</legend><div class="layout-options"><label class="layout-option"><input type="radio" name="layout" value="full" checked><span class="layout-icon single">▭</span><strong>Full page</strong><small>1 large sign</small></label><label class="layout-option"><input type="radio" name="layout" value="two"><span class="layout-icon double">▭<br>▭</span><strong>2 per page</strong><small>2 wide signs</small></label><label class="layout-option"><input type="radio" name="layout" value="four"><span class="layout-icon quad">▭ ▭<br>▭ ▭</span><strong>4 per page</strong><small>4 small signs</small></label></div></fieldset><div class="format"><span class="paper-icon">▤</span><div><strong id="format-title"></strong><small id="format-description"></small></div><span class="check">✓</span></div><p class="layout-note">2- and 4-sign sheets repeat this product and include cut guides.</p><button type="submit" class="primary"><span>↓ &nbsp; Download PDF</span><span>${arrow}</span></button><button type="button" class="secondary" id="print">▤ &nbsp; Print sheet</button><p class="footnote">Ready to print. No color ink needed.</p></form></section>
<section class="preview-area"><div class="preview-heading"><div class="section-heading"><span class="step">02</span><h2>Your sign, live</h2></div><span class="live"><span class="status-dot"></span> LIVE PREVIEW</span></div><div class="paper-stage"><div id="sheet-preview" aria-live="polite"></div></div><div class="preview-caption"><span>↑ &nbsp; Preview of your whole printed sheet.</span><span>100% BLACK & WHITE</span></div></section></div>
<div class="how"><span class="eyebrow">FROM DETAILS TO DISPLAY</span><div><span>01</span> Add your product</div><span class="flow-arrow">→</span><div><span>02</span> Check your sign</div><span class="flow-arrow">→</span><div><span>03</span> Print & put it up</div></div></main><footer><span>Brian's Ace Sign Maker</span><span>Simple signs. Standout savings.</span></footer>`;
const form = document.querySelector('#details');
const error = document.querySelector('#error');
const downloadButton = form.querySelector('.primary');
const printButton = document.querySelector('#print');
const printStyle = document.createElement('style');
document.head.append(printStyle);

function data() {
  return {
    product: form.elements.product.value.trim(),
    item: form.elements.namedItem('item').value.trim(),
    regular: Number(form.elements.regular.value),
    sale: Number(form.elements.sale.value),
    signType: form.elements.signType.value,
    startDate: form.elements.startDate.value,
    endDate: form.elements.endDate.value,
  };
}
function layoutKey() { return form.elements.layout.value; }
function update() {
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
  document.querySelector('#sheet-preview').innerHTML = renderSheet(values, key);
  document.querySelector('#format-title').textContent = `${layout.label} · Landscape signs`;
  document.querySelector('#format-description').textContent = `US Letter · ${layout.width} × ${layout.height} in · ${layout.orientation} sheet`;
  printStyle.textContent = `@page { size: ${layout.width}in ${layout.height}in; margin: 0; } @media print { .print-sheet { width: ${layout.width}in; height: ${layout.height}in; } }`;
  error.textContent = '';
}
function valid() {
  if (!form.reportValidity()) return false;
  const values = data();
  if (!values.product) { error.textContent = 'Please enter a product name.'; return false; }
  if (values.signType === 'sale' && values.sale >= values.regular) { error.textContent = 'Sale price must be lower than the regular price.'; return false; }
  if (values.signType === 'sale' && values.startDate && values.endDate && values.endDate < values.startDate) {
    error.textContent = 'Promotion end date must be on or after the start date.';
    return false;
  }
  return true;
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
    const filename = values.product.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'sale';
    pdf.save(`${filename}-${layout.count}-per-page.pdf`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

form.addEventListener('input', update);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!valid()) return;
  downloadButton.disabled = true;
  printButton.disabled = true;
  const label = downloadButton.innerHTML;
  downloadButton.textContent = 'Preparing your PDF…';
  try { await downloadPDF(data(), layoutKey()); }
  catch { error.textContent = 'Could not create your PDF. Please try again.'; }
  finally {
    downloadButton.innerHTML = label;
    downloadButton.disabled = false;
    printButton.disabled = false;
  }
});
printButton.addEventListener('click', () => { if (valid()) window.print(); });
update();
