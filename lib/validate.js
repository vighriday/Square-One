// Exact frontend validators; only the refusal signal differs.
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const str = (v, max) => typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
function vQ(o) {
  if (!o || typeof o !== 'object') return null;
  const q = str(o.q, 240), fix = str(o.fix, 160) || '';
  if (!q || !Array.isArray(o.a) || o.a.length !== 4) return null;
  const a = o.a.map(x => str(typeof x === 'number' ? String(x) : x, 110));
  if (a.some(x => !x) || new Set(a.map(x => x.toLowerCase())).size !== 4) return null;
  const c = Number(o.c); if (!Number.isInteger(c) || c < 0 || c > 3) return null;
  return { q, a, c, fix };
}
const vFort = (j, skill, lang) => {
  if (!j || j.ok === false) { return { refusal: true }; }
  const fortName = str(j.fortName, 40); if (!fortName || !Array.isArray(j.floors) || j.floors.length < 4 || !Array.isArray(j.rooms) || j.rooms.length < 20) return null;
  const floors = j.floors.slice(0, 4).map(f => ({ name: str(f && f.name, 40) || 'Floor', parMinutes: clamp(Number(f && f.parMinutes) || 20, 5, 240) }));
  const rooms = j.rooms.slice(0, 20).map(r => ({ title: str(r && r.title, 60), why: str(r && r.why, 160) || '' }));
  if (rooms.some(r => !r.title)) return null;
  return { id: 'f' + Date.now().toString(36), skill, lang, fortName, floors, rooms: rooms.map(r => ({ title: r.title, why: r.why, content: null })), warm: null, extras: null };
};
const vWarm = (j) => { if (!j || j.ok === false) return { refusal: true }; const qs = (j.questions || []).map(vQ).filter(Boolean); return qs.length >= 3 ? qs.slice(0, 3) : null; };
const vRoom = (j) => {
  if (!j) return null;
  const steps = (Array.isArray(j.steps) ? j.steps : []).map(s => str(s, 160)).filter(Boolean).slice(0, 5);
  const m = vQ(j.monster); if (steps.length < 2 || !m) return null;
  return { steps, doneWhen: str(j.doneWhen, 200) || '', video: str(j.video, 80) || '', minutes: clamp(Number(j.minutes) || 10, 1, 120), monster: Object.assign(m, { name: str(j.monster.name, 40) || 'Mistake Imp' }) };
};
const vExtras = (j) => {
  if (!j) return null;
  const secrets = (j.secrets || []).slice(0, 2).map(s => { const qs = (s && s.questions || []).map(vQ).filter(Boolean); return qs.length >= 3 ? { questions: qs.slice(0, 3) } : null; });
  const elites = (j.elites || []).slice(0, 2).map((e, i) => { const q = vQ(e); return q ? Object.assign(q, { name: str(e.name, 40) || 'Elite Brute', teaches: i ? 9 : 7 }) : null; });
  const bosses = (j.bosses || []).slice(0, 4).map(b => { const qs = (b && b.questions || []).map(vQ).filter(Boolean); return qs.length ? { name: str(b.name, 40) || null, questions: qs.slice(0, 3) } : null; });
  return { secrets, elites, bosses };
};

export { vQ, vFort, vWarm, vRoom, vExtras };
export const validators = { fort: vFort, warm: vWarm, room: vRoom, extras: vExtras };
