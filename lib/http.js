import { createHash } from 'node:crypto';
import { config } from './config.js';
export class HttpError extends Error {
  constructor(status, code, headers = {}) { super(code); this.status = status; this.headers = headers; }
}
export const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers } });
export function error(e) { return json({ error: e instanceof HttpError ? e.message : 'internal_error' }, e.status || 500, e.headers); }
export function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  try { if (new URL(origin).host === new URL(request.url).host || config.allowedOrigins.includes(origin)) return; } catch {}
  throw new HttpError(403, 'bad_origin');
}
export async function readBody(request, limit, plain = false) {
  const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json' && !(plain && type === 'text/plain')) throw new HttpError(415, 'bad_content_type');
  if (Number(request.headers.get('content-length')) > limit) throw new HttpError(413, 'body_too_large');
  const chunks = []; let size = 0;
  const reader = request.body?.getReader();
  if (reader) {
    for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) { await reader.cancel(); throw new HttpError(413, 'body_too_large'); } chunks.push(value); }
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'bad_json'); }
}
export const sha256 = s => createHash('sha256').update(s).digest('hex');
export function ipHash(request) { return sha256(config.ipSalt + ':' + (request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local')); }
export function cookies(request) { return Object.fromEntries((request.headers.get('cookie') || '').split(';').map(s => { const i = s.indexOf('='); return i < 0 ? ['', ''] : [s.slice(0, i).trim(), s.slice(i + 1)]; })); }
