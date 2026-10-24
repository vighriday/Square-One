import { mock } from './mock.js';
import { validators } from '../validate.js';
import { config } from '../config.js';
import { db, query } from '../db.js';
import { sha256, HttpError } from '../http.js';
import { gemini } from './gemini.js';
const inflight = new Map();
export function parseJSON(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('no_json');
  const s = text.slice(a, b + 1); let out = '', quoted = false, escaped = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (!quoted && c === ',' && /^\s*[}\]]/.test(s.slice(i + 1))) continue;
    out += c;
    if (escaped) escaped = false;
    else if (quoted && c === '\\') escaped = true;
    else if (c === '"') quoted = !quoted;
  }
  return JSON.parse(out);
}
export function validate(info, answer) { try { return validators[info.kind](answer, info.displaySkill, 'en'); } catch { return null; } }
export const extrasQuality = v => v && v.secrets.filter(Boolean).length >= 1 && v.elites.filter(Boolean).length >= 1 && v.bosses.filter(Boolean).length >= 2;
export async function resolveAnswer(prompt, info, { mode = config.mode, provider = gemini, cache = db ? query : null, now = Date.now } = {}) {
  const start = now(), hash = sha256(prompt), deadline = start + info.budget;
  const result = (text, model, cached = false) => ({ text, cached, kind: info.kind, model, ms: Math.max(0, now() - start) });
  const fallback = () => result(JSON.stringify(mock(info)), 'mock');
  if (mode === 'mock') return fallback();
  if (cache) {
    try {
      const rows = await cache('select response,model from ai_cache where prompt_hash=$1 and (expires_at is null or expires_at>now())', [hash]);
      if (rows[0] && validate(info, parseJSON(rows[0].response))) {
        cache('update ai_cache set hits=hits+1 where prompt_hash=$1', [hash]).catch(() => {});
        return result(rows[0].response, rows[0].model, true);
      }
    } catch { /* A cache outage must not prevent provider or mock operation. */ }
  }
  let failure;
  for (let attempt = 0; attempt < 2 && now() < deadline; attempt++) {
    try {
      const reply = await provider(prompt + (attempt ? '\n\nYour previous reply was not valid JSON in the required shape. Reply again with ONLY the JSON object.' : ''), info, deadline);
      const answer = parseJSON(reply.text), valid = validate(info, answer);
      if (!valid || (info.kind === 'extras' && !attempt && !extrasQuality(valid))) throw new Error('invalid_answer');
      const refusal = !!valid.refusal, text = refusal ? '{"ok":false}' : JSON.stringify(answer);
      if (cache) try { await cache("insert into ai_cache(prompt_hash,kind,skill,response,refusal,model,expires_at) values($1,$2,$3,$4,$5,$6,now()+($7 * interval '1 day')) on conflict(prompt_hash) do update set response=excluded.response,refusal=excluded.refusal,model=excluded.model,expires_at=excluded.expires_at", [hash, info.kind, info.skill, text, refusal, reply.model, refusal ? 1 : 30]); } catch {}
      return result(text, reply.model);
    } catch (e) { failure = e; if (e.message === 'bad_key') break; }
  }
  if (mode === 'live+mock') return fallback();
  throw new HttpError(502, failure?.message === 'bad_key' ? 'bad_key' : 'ai_failed');
}
export async function complete(prompt, info) {
  if (config.mode === 'mock') return resolveAnswer(prompt, info);
  const key = sha256(prompt);
  if (inflight.has(key)) return inflight.get(key);
  const promise = resolveAnswer(prompt, info).finally(() => inflight.delete(key));
  inflight.set(key, promise); return promise;
}
