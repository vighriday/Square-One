import { randomBytes } from 'node:crypto';
import { cookies, error } from './http.js';
import { touchPlayer, maintenance } from './db.js';
export function player(request) {
  const old = cookies(request).sq_pid;
  const valid = /^[A-Za-z0-9_-]{22}$/.test(old || '');
  const id = valid ? old : randomBytes(16).toString('base64url');
  const cookie = valid ? null : `sq_pid=${id}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${request.headers.get('x-forwarded-proto') === 'https' ? '; Secure' : ''}`;
  return { id, cookie };
}
export function route(handler) {
  return async (request, context = {}) => {
    const p = player(request);
    const background = promise => {
      const safe = Promise.resolve(promise).catch(() => { console.error('Background database operation failed'); });
      if (typeof context.waitUntil === 'function') context.waitUntil(safe);
    };
    background(touchPlayer(p.id));
    background(maintenance());
    let response;
    try { response = await handler(request, p.id, background); } catch (e) { response = error(e); }
    if (p.cookie) response.headers.append('set-cookie', p.cookie);
    return response;
  };
}
