import { config } from './config.js';
import { db, query } from './db.js';
import { HttpError, sha256, ipHash } from './http.js';
import { rateLimit } from './ratelimit.js';
export function filterParams(kind, input) {
  const out = new URLSearchParams();
  if (kind === 'search') {
    if ((input.has('part') && input.get('part') !== 'snippet') || (input.has('type') && input.get('type') !== 'video')) throw new HttpError(400, 'bad_params');
    const q = input.get('q') || '', n = Number(input.get('maxResults') || 8);
    if (!q.trim() || q.length > 120 || !Number.isInteger(n) || n < 1) throw new HttpError(400, 'bad_params');
    out.set('part', 'snippet'); out.set('type', 'video'); out.set('maxResults', String(Math.min(8, n))); out.set('q', q);
    for (const [name, values] of [['safeSearch', ['none', 'moderate', 'strict']], ['videoEmbeddable', ['any', 'true']]]) {
      if (input.has(name)) { if (!values.includes(input.get(name))) throw new HttpError(400, 'bad_params'); out.set(name, input.get(name)); }
    }
  } else {
    const parts = [...new Set((input.get('part') || 'statistics,contentDetails,snippet').split(','))], ids = (input.get('id') || '').split(',');
    if (parts.some(p => !['statistics', 'contentDetails', 'snippet'].includes(p)) || ids.length > 8 || ids.some(id => !/^[\w-]{11}$/.test(id))) throw new HttpError(400, 'bad_params');
    out.set('part', parts.sort().join(',')); out.set('id', ids.join(','));
  }
  out.sort(); return out;
}
export async function youtube(kind, request, id, { key = config.youtubeKey, fetcher = fetch, cache = db ? query : null, limiter = rateLimit } = {}) {
  if (!key) throw new HttpError(503, 'youtube_off');
  const params = filterParams(kind, new URL(request.url).searchParams);
  await limiter('yt:p:' + id, 30, 600000); await limiter('yt:i:' + ipHash(request), 90, 600000);
  const hash = sha256(kind + ':' + params.toString());
  if (cache) try { const rows = await cache('select response from video_cache where cache_key=$1 and expires_at>now()', [hash]); if (rows[0]) return Response.json(rows[0].response, { headers: { 'cache-control': 'no-store' } }); } catch {}
  params.set('key', key);
  let response, body;
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 9000);
  try { response = await fetcher(`https://www.googleapis.com/youtube/v3/${kind}?${params}`, { signal: controller.signal }); body = await response.text(); JSON.parse(body); }
  catch { throw new HttpError(502, 'youtube_failed'); }
  finally { clearTimeout(timer); }
  if (cache && response.status === 200) try { await cache("insert into video_cache(cache_key,response,expires_at) values($1,$2::jsonb,now()+($3 * interval '1 day')) on conflict(cache_key) do update set response=excluded.response,created_at=now(),expires_at=excluded.expires_at", [hash, body, kind === 'search' ? 7 : 1]); } catch {}
  return new Response(body, { status: response.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
