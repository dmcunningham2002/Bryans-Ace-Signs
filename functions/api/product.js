import { handleLookup } from '../../worker/index.js';

// Pages discovers this route during its Git build; reuse the same lookup handler.
export function onRequest(context) {
  return handleLookup(context.request, {
    cache: caches.default,
    waitUntil: promise => context.waitUntil(promise),
  });
}
