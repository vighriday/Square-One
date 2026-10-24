import { neon } from '@neondatabase/serverless';
import { config } from './config.js';
export const db = config.databaseUrl ? neon(config.databaseUrl, { fetchOptions: { signal: undefined } }) : null;
export async function query(text, params = []) { return db ? db.query(text, params, { fetchOptions: { signal: AbortSignal.timeout(8000) } }) : []; }
export async function touchPlayer(id) {
  if (db) await query('insert into players(id) values ($1) on conflict(id) do update set last_seen=now()', [id]);
}
export async function maintenance(random = Math.random) {
  if (db && random() < 0.01) await db.transaction([
    db.query("delete from ai_calls where created_at < now() - interval '30 days'"),
    db.query('delete from ai_cache where expires_at < now()'),
    db.query('delete from video_cache where expires_at < now()')
  ], { fetchOptions: { signal: AbortSignal.timeout(8000) } });
}
export async function logCall(id, info, result) {
  if (db) await query('insert into ai_calls(player_id,kind,cached,ok,model,ms,error) values($1,$2,$3,$4,$5,$6,$7)', [id, info.kind, !!result.cached, result.ok !== false, result.model || null, result.ms || 0, result.error || null]);
}
