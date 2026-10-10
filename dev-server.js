import { createServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import { handleLookup } from './worker/index.js';

// Run the same lookup handler locally while Vite serves the application.
const args = process.argv.slice(2);
const api = createServer(async (incoming, outgoing) => {
  const request = new Request(`http://127.0.0.1:8788${incoming.url}`, { method: incoming.method });
  let response;
  try { response = await handleLookup(request); }
  catch { response = Response.json({ error: 'Lookup is unavailable. Please enter details manually.' }, { status: 502 }); }
  outgoing.writeHead(response.status, Object.fromEntries(response.headers));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
});
await new Promise((resolve, reject) => { api.once('error', reject); api.listen(8788, '127.0.0.1', resolve); });
const portIndex = args.indexOf('--port');
const vite = await createViteServer({ server: { host: '0.0.0.0', port: portIndex >= 0 ? Number(args[portIndex + 1]) : 5173 } });
await vite.listen();
vite.printUrls();
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await vite.close(); api.close(() => process.exit(0)); });
