import { db, query } from './db.js';
import { HttpError } from './http.js';
const memory = new Map();
export async function rateLimit(bucket, limit, windowMs, { now = Date.now(), sql = db ? query : null, random = Math.random } = {}) {
  const start = Math.floor(now / windowMs) * windowMs;
  let count;
  if (sql) {
    try {
      const rows = await sql('insert into rate_hits(bucket,window_start,count) values($1,$2,1) on conflict(bucket,window_start) do update set count=rate_hits.count+1 returning count', [bucket, new Date(start).toISOString()]);
      count = Number(rows[0].count);
      if (random() < 0.02) sql("delete from rate_hits where window_start < now() - interval '1 day'").catch(() => {});
    } catch { /* Keep limits usable while the DB is waking or unavailable. */ }
  }
  if (count === undefined) {
    const key = `${bucket}:${start}`, entry = memory.get(key);
    count = (entry?.count || 0) + 1;
    memory.set(key, { count, end: start + windowMs });
    if (memory.size > 10000 || random() < 0.02) for (const [key, entry] of memory) if (entry.end <= now) memory.delete(key);
  }
  if (count > limit) throw new HttpError(429, 'rate_limited', { 'retry-after': String(Math.max(1, Math.ceil((start + windowMs - now) / 1000))) });
}
