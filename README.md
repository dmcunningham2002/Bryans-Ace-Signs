# Brian's Ace Sign Maker

A static, black-and-white sale sign generator. Enter a product name, optional Ace item number, regular price, and sale price. Choose full page, 2 per page, or 4 per page, then preview, download a PDF, or print.

All signs are landscape. Full-page and 4-per-page sheets use landscape US Letter; 2-per-page sheets use portrait US Letter with two landscape signs stacked. Multi-sign sheets repeat the same product and include cut guides. Printing uses 0.3-inch safe margins; choose actual size/100% scale and disable browser headers and footers.

The preview, print output, and PDF use the same SVG sheet. PDF downloads embed it at 300 dpi, including the Ace wordmark, with no external image or font requests.

## Development

Use Node.js 24. Run `npm ci`, then `npm run dev`. Build with `npm run build`.

In this cloud environment, use `npm ci --cache /workspace/.npm-cache` if the default npm cache is unavailable.

## Cloudflare Pages

- Production branch: `main`
- Build command: `npm run build`
- Build output: `dist`
- Root directory: leave blank when this repository is connected directly
- Environment variable: `NODE_VERSION=24`

No backend or API keys are required.

## Logo source

The bundled Ace wordmark comes from the vector artwork in [Ace_Hardware_Logo.svg](https://github.com/rmwhaling/myoviedo/blob/master/images/Ace_Hardware_Logo.svg). The lettering is retained as vector paths and rendered in black for monochrome printing. Ace's trademark belongs to its owner.
