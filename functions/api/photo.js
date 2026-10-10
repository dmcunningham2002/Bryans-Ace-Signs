import { handlePhoto } from '../../worker/photo.js';

export function onRequest(context) {
  return handlePhoto(context.request);
}
