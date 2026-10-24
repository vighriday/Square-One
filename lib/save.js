import { db } from './db.js';
import { HttpError } from './http.js';
const decode = s => { try { return s === null ? null : JSON.parse(s); } catch { return null; } };
const text = v => typeof v === 'string' ? v.slice(0, 160) : null;
const integer = v => Math.max(0, Math.min(2147483647, Math.trunc(Number(v) || 0)));
export function parseSave(body) {
  if (!body || !['profile', 'game'].every(k => body[k] === null || typeof body[k] === 'string')) throw new HttpError(400, 'bad_save');
  let profile = decode(body.profile), game = decode(body.game);
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) profile = null;
  if (!(game && game.fort && game.run && Array.isArray(game.fort.rooms) && game.fort.rooms.length === 20 && game.run.room >= 1 && game.run.room <= 20)) game = null;
  const fort = game?.fort, run = game?.run;
  return { profile, game, fortId: text(fort?.id), skill: text(fort?.skill)?.trim().toLowerCase() || null,
    room: run ? integer(run.room) : null, roomsDone: run && Array.isArray(run.status) ? run.status.filter(s => s === 'done').length : 0,
    score: integer(run?.score), lang: text(profile?.lang), streak: integer(profile?.streak) };
}
export async function save(id, parsed, client = db) {
  if (!client) return;
  const p = parsed, f = p.game?.fort;
  const queries = [client.query('insert into players(id,lang,streak_days) values($1,$2,$3) on conflict(id) do update set last_seen=now(),lang=excluded.lang,streak_days=excluded.streak_days', [id, p.lang, p.streak])];
  if (f && p.fortId && p.skill) queries.push(client.query('insert into forts(id,skill,lang,fort_name,sample,first_player) values($1,$2,$3,$4,$5,$6) on conflict(id) do nothing', [p.fortId, p.skill, text(f.lang), text(f.fortName), !!f.sample, id]));
  queries.push(client.query('insert into saves(player_id,profile,game,fort_id,skill,room,rooms_done,score) values($1,$2::jsonb,$3::jsonb,$4,$5,$6,$7,$8) on conflict(player_id) do update set profile=excluded.profile,game=excluded.game,fort_id=excluded.fort_id,skill=excluded.skill,room=excluded.room,rooms_done=excluded.rooms_done,score=excluded.score,updated_at=now()', [id, p.profile === null ? null : JSON.stringify(p.profile), p.game === null ? null : JSON.stringify(p.game), p.fortId, p.skill, p.room, p.roomsDone, p.score]));
  try { await client.transaction(queries, { fetchOptions: { signal: AbortSignal.timeout(8000) } }); } catch { throw new HttpError(503, 'db_unavailable'); }
}
