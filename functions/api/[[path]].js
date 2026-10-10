export function onRequest() {
  return Response.json({ error: 'Unknown lookup endpoint.' }, {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
