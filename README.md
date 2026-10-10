# Brian's Ace Sign Maker

A black-and-white sign generator with optional Ace item lookup. Enter a product name and optional Ace item number, then choose a sale sign or a regular-price sign. Sale signs use regular and sale prices; regular-price signs show only the regular price, with no sale labels or savings. Choose full page, 2 per page, or 4 per page, then preview, download a PDF, or print.

## Item lookup

Enter an Ace item number and click **Look up item** (or press Enter). Lookup fills the product name, an editable short description, a grayscale product photo when available, and available online regular/sale prices. It selects sale or regular-price mode and clears previous promotion dates. You can edit every text/price field and turn the photo off. Descriptions are limited to 200 characters to keep signs readable.

**Prices are Ace online catalog prices, not verified Keystone Heights store prices. Confirm and adjust them before printing.** The app displays this reminder after lookup. The supplied Ace homepage link does not contain a store identifier, and no store-specific feed or API credentials are configured.

The same-origin endpoint `GET /api/product?item=1043304` reads the matching public product page and retrieves photos only from Ace's tenant on its image CDN. It runs as a Cloudflare Pages Function or a standalone Worker and sends no authentication or store cookies. Successful lookups are cached for up to 15 minutes; uncached requests have a five-second per-client cooldown within a runtime instance. Requests time out, have response-size limits, and reject redirects to other hosts. Missing images do not discard product text or prices. If a product is unavailable, blocked, or the public page format changes, manual entry continues to work. This public-page lookup is not an official Ace API integration or a guarantee of product availability.

Ace can allow public pages in a browser or this development environment while rejecting requests from a deployed Cloudflare service. Lookup errors report the upstream HTTP status: 401/403 means access was denied, 429 means requests were limited, and other failures show their status. An item-page link remains available after failure so users can open Ace directly. Access denials require an approved Ace catalog feed/API for reliable integration; rebuilding Cloudflare does not provide that access. This diagnostic handling does not bypass Ace's restrictions or restore a denied lookup. API failures expose only the status and a safe message, never upstream response bodies or cookies.

Sale signs offer optional start and end dates printed in the footer. Enter only an end date to show when a sale ends, or enter both dates to show the promotion period. End dates must be on or after start dates. Dates are formatted as calendar dates without timezone shifts and are hidden for regular-price signs.

All signs are landscape. Full-page and 4-per-page sheets use landscape US Letter; 2-per-page sheets use portrait US Letter with two landscape signs stacked. Multi-sign sheets repeat the same product and include cut guides. Printing uses 0.3-inch safe margins; choose actual size/100% scale and disable browser headers and footers.

The preview, print output, and PDF use the same SVG sheet. PDF downloads embed it at 300 dpi, including the Bryan’s Ace logo and optional product photo, with no external image or font requests when rendering/exporting the sign.

## Development

Use Node.js 24. Run `npm ci`, then `npm run dev`. The development command starts Vite on port 5173 and the lookup handler on localhost port 8788. Node's environment-proxy support allows lookup through the cloud environment's configured proxy. Build with `npm run build`; run the catalog/backend tests with `npm test`.

For Pages runtime checks, build first and run `npx wrangler pages dev dist --port 8787`. `npm run preview` previews only the static files and does not provide the lookup endpoint.

The cloud environment's local Workers simulator does not use its HTTPS egress proxy for Worker subrequests. Use `npm run dev` for live lookup here; local Wrangler can still check asset routing and error handling. Worker execution was separately verified with its outbound requests routed through the environment's supported Node proxy.

In this cloud environment, use `npm ci --cache /workspace/.npm-cache` if the default npm cache is unavailable.

## Cloudflare Pages deployment

The `bryans-ace-signs` Pages project builds directly from this Git repository. Its `functions/api/product.js` route serves the lookup endpoint using the shared backend. `public/_routes.json` limits Function invocation to API routes so static files are served directly. The checked-in `wrangler.jsonc` contains Pages-compatible configuration.

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: leave blank (or use `/`); `package.json` is a file, not a directory
- Environment variable: `NODE_VERSION=24`

Pages has no separate deploy-command field. Merge the update into `main` and let the connected Pages project build and deploy the static files and Functions together. You can retry the latest production build from Deployments after updating build settings. No Ace API key or additional binding is needed.

To check the Functions bundle without publishing, run `npx wrangler pages functions build functions --outdir /tmp/ace-pages-functions --build-output-directory dist`. For an authenticated manual Pages deployment, build first and run `npm run deploy`.

## Optional Cloudflare Workers deployment

For the separate `bryans-ace-signs.dmcunningham2002.workers.dev` site, `wrangler.worker.jsonc` preserves the standalone Worker and static assets configuration. Use this file explicitly so it is not confused with the Pages configuration.

- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy --config wrangler.worker.jsonc` (or `npm run deploy:worker`)
- Static assets: `dist`, supplied by `wrangler.worker.jsonc`
- Root directory: leave blank when this repository is connected directly
- Environment variable: `NODE_VERSION=24`

Use the explicit Worker deploy command above in the connected Workers build and remove any static-only `--assets=dist` overrides. No Ace API keys or environment secrets are needed. Deployment uses the Cloudflare account authentication already configured in the connected build.

To check Worker packaging without publishing, run `npx wrangler deploy --config wrangler.worker.jsonc --dry-run`. In this cloud environment, if Wrangler's default configuration path is unavailable, prefix local Wrangler commands with `XDG_CONFIG_HOME=/tmp/ace-wrangler-config WRANGLER_SEND_METRICS=false`.

## Logo source

Product text is centered in the left section. Ace item numbers are centered and printed in a larger bold font, with automatic sizing for longer numbers.

The current Bryan’s Ace Hardware logo is a cleaned monochrome version of the image supplied in chat. It retains the supplied Bryan’s / ACE / “The helpful place.” layout, with the screenshot frame and checkerboard removed and red converted to black for printing. The PNG is embedded directly in the generated SVG so preview, PDF, and printing do not depend on an external image request.

The earlier Ace vector artwork came from [Ace_Hardware_Logo.svg](https://github.com/rmwhaling/myoviedo/blob/master/images/Ace_Hardware_Logo.svg). Ace’s trademark belongs to its owner.
