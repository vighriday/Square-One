import { db, query } from './db.js';
const empty = () => ({ players_total: 0, players_today: 0, forts_total: 0, forts_today: 0, rooms_done_total: 0, ai_calls_today: 0, cache_hit_pct_today: 0, avg_live_ms_today: 0, top_skills: [] });
export const statsSQL = `select
  (select count(*) from players) as players_total,
  (select count(*) from players where last_seen >= now()-interval '24 hours') as players_today,
  (select count(*) from forts where not sample) as forts_total,
  (select count(*) from forts where not sample and created_at >= now()-interval '24 hours') as forts_today,
  (select coalesce(sum(rooms_done),0) from saves) as rooms_done_total,
  (select count(*) from ai_calls where created_at >= now()-interval '24 hours') as ai_calls_today,
  (select coalesce(round(100.0*count(*) filter(where cached)/nullif(count(*),0),1),0) from ai_calls where created_at >= now()-interval '24 hours') as cache_hit_pct_today,
  (select coalesce(round(avg(ms)),0) from ai_calls where created_at >= now()-interval '24 hours' and ok and not cached and model <> 'mock') as avg_live_ms_today,
  (select coalesce(json_agg(t),'[]'::json) from (select lower(trim(skill)) as skill,count(*) as count from forts where not sample group by lower(trim(skill)) order by count(*) desc,lower(trim(skill)) limit 5) t) as top_skills`;
export function createStats(sql = db ? query : null, now = Date.now) {
  let cached, expires = 0, pending;
  return async () => {
    if (cached && now() < expires) return cached;
    if (pending) return pending;
    pending = (async () => {
      const rows = sql ? await sql(statsSQL) : [], result = { ...empty(), ...rows[0] };
      for (const key of Object.keys(empty()).filter(k => k !== 'top_skills')) result[key] = Number(result[key]) || 0;
      result.top_skills = (result.top_skills || []).map(s => ({ skill: s.skill, count: Number(s.count) }));
      cached = result; expires = now() + 10000; return result;
    })().finally(() => { pending = null; });
    return pending;
  };
}
export const getStats = createStats();
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function statsPage(stats) {
  const labels = { players_total: 'Players', players_today: 'Players · last 24h', forts_total: 'Forts built', forts_today: 'Forts · last 24h', rooms_done_total: 'Rooms completed', ai_calls_today: 'AI calls · last 24h', cache_hit_pct_today: 'Cache hits · % today', avg_live_ms_today: 'Live AI · average ms' };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="10"><title>Square One · Stats</title><link rel="icon" href="/favicon.ico"><link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{margin:0;background:#07061a;color:#f5ecd9;font:18px/1.6 system-ui,sans-serif}main{max-width:760px;margin:auto;padding:28px 20px}h1{font-size:24px;color:#ffb22e}dl{margin:28px 0}dl>div{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;border-bottom:1px solid #39335f;padding:22px 0}dt{flex:1}dd{margin:0;color:#ffb22e;font:clamp(17px,4vw,26px)/1.5 'Press Start 2P',monospace}a{color:#ffb22e}li{overflow-wrap:anywhere}small{color:#c4bbce}</style></head><body><main><h1>SQUARE ONE · STATS</h1><small>Refreshes every 10 seconds. “Today” means the last 24 hours.</small><dl>${Object.entries(labels).map(([k, label]) => `<div><dt>${label}</dt><dd>${escape(stats[k])}</dd></div>`).join('')}</dl><h2>Top skills</h2>${stats.top_skills.length ? '<ol>' + stats.top_skills.map(s => `<li>${escape(s.skill)} · ${escape(s.count)}</li>`).join('') + '</ol>' : '<p>No forts built yet.</p>'}<a href="/">Back to the game</a></main></body></html>`;
}
