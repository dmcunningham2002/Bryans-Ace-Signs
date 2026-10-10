# Brian's Ace Sign Maker

A static, black-and-white sign generator. Enter a product name and optional Ace item number, then choose a sale sign or a regular-price sign. Sale signs use regular and sale prices; regular-price signs show only the regular price, with no sale labels or savings. Choose full page, 2 per page, or 4 per page, then preview, download a PDF, or print.

Sale signs offer optional start and end dates printed in the footer. Enter only an end date to show when a sale ends, or enter both dates to show the promotion period. End dates must be on or after start dates. Dates are formatted as calendar dates without timezone shifts and are hidden for regular-price signs.

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

Product text is centered in the left section. Ace item numbers are centered and printed in a larger bold font, with automatic sizing for longer numbers.

The custom monochrome Bryan’s Ace Hardware wordmark pairs store-name text with the bundled Ace artwork; it is not an exact reproduction of a supplied store logo. The bundled Ace artwork comes from the vector artwork in [Ace_Hardware_Logo.svg](https://github.com/rmwhaling/myoviedo/blob/master/images/Ace_Hardware_Logo.svg). The lettering is retained as vector paths and rendered in black for monochrome printing. Ace's trademark belongs to its owner.
