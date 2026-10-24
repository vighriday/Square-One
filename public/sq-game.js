(function () {
'use strict';
const SQ = window.SQ;
if (!SQ || (SQ._loaded && SQ._loaded.game)) return;
const { clamp } = SQ.util;
const EXTRA = {
  en: { boot1: 'Reading your save', boot2: 'Loading fonts', boot3: 'Cutting sandstone', boot4: 'Summoning monsters', boot5: 'Tuning the chiptune', boot6: 'Ready', gp: 'Glide', ofl: 'Sample content is in English.', warmGo: 'Fire the weapon with the right answer', you: 'You' },
  hi: { boot1: 'आपका सेव पढ़ रहे हैं', boot2: 'फ़ॉन्ट लोड हो रहे हैं', boot3: 'बलुआ पत्थर काट रहे हैं', boot4: 'राक्षस बुला रहे हैं', boot5: 'संगीत तैयार कर रहे हैं', boot6: 'तैयार', gp: 'ग्लाइड', ofl: 'सैंपल सामग्री अंग्रेज़ी में है।', warmGo: 'सही जवाब वाला हथियार चलाएँ', you: 'आप' },
  hl: { boot1: 'Aapka save padh rahe hain', boot2: 'Fonts load ho rahe hain', boot3: 'Sandstone kaat rahe hain', boot4: 'Monsters bula rahe hain', boot5: 'Chiptune tune kar rahe hain', boot6: 'Ready', gp: 'Glide', ofl: 'Sample content English mein hai.', warmGo: 'Sahi answer wala weapon chalao', you: 'Aap' }
};
Object.keys(EXTRA).forEach(k => Object.assign(SQ.I18N[k], EXTRA[k]));
const tr = (lang, key, vars) => { let s = (SQ.I18N[lang] || SQ.I18N.en)[key]; if (s == null) s = SQ.I18N.en[key]; if (s == null) s = (EXTRA[lang] || EXTRA.en)[key]; if (s == null) s = EXTRA.en[key]; if (s == null) s = key; if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : m); return s; };
const rich = (s) => { const out = []; String(s || '').split('`').forEach((p, i) => { if (p) out.push({ text: p, code: i % 2 === 1, plain: i % 2 === 0 }); }); return out; };
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clone = (o) => JSON.parse(JSON.stringify(o));
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
const fmtTime = (s) => { s = Math.max(0, Math.round(s)); const m = (s / 60) | 0; return m + ':' + String(s % 60).padStart(2, '0'); };
const LANGNAME = { en: 'English', hi: 'Hindi written in Devanagari script (keep code, commands and technical terms in English)', hl: 'Hinglish: Hindi in Latin script mixed naturally with English (keep code in English)' };

const LAYOUT = [
  '11L11D11L11',
  '1.........1',
  'L.P.....P.L',
  '1.........1',
  '1.........1',
  'T.........C',
  '1.........1',
  '1.........1',
  'L.P.....P.L',
  '1.........1',
  '1.........1',
  '11L11111L11'
];
const SPAWN = { x: 5.5, y: 10.3, a: -Math.PI / 2 };
const TERM = { x: 0.5, y: 5.5, stand: { x: 1.65, y: 5.5, a: Math.PI } };
const CRACK = { x: 10.5, y: 5.5, stand: { x: 9.35, y: 5.5, a: 0 } };
const BOSS_ROOMS = [5, 10, 15, 20], ELITE_ROOMS = { 14: 7, 18: 9 }, SECRET_ROOMS = [3, 12];
const floorOf = (n) => ((n - 1) / 5) | 0;

// ---------- storage ----------
function Store() { this.ok = true; this.mem = {}; try { localStorage.setItem('__sq', '1'); localStorage.removeItem('__sq'); } catch (e) { this.ok = false; } }
Store.prototype.get = function (k) { try { return this.ok ? localStorage.getItem(k) : (this.mem[k] ?? null); } catch (e) { return this.mem[k] ?? null; } };
Store.prototype.set = function (k, v) { this.mem[k] = v; if (!this.ok) return false; try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
Store.prototype.del = function (k) { delete this.mem[k]; try { localStorage.removeItem(k); } catch (e) { } };
const KP = 'squareone.v1.profile', KG = 'squareone.v1.game';

// ---------- AI ----------
const aiOk = () => !!(window.claude && typeof window.claude.complete === 'function');
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
function parseJSON(txt) { const s = String(txt), a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a < 0 || b <= a) throw new Error('nojson'); return JSON.parse(s.slice(a, b + 1)); }
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
async function askAI(prompt, validate, tries = 2, ms = 50000) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { const out = await withTimeout(window.claude.complete(prompt), ms); const v = validate(parseJSON(out)); if (v) return v; last = new Error('invalid'); } catch (e) { last = e; if (e && e.message === 'refused') break; }
  }
  throw last || new Error('ai');
}
const QSHAPE = '{"q":"question (wrap code in backticks)","a":["four","distinct","short","answers"],"c":INDEX_OF_CORRECT_0_TO_3,"fix":"one-line fix, max 14 words"}';
const AIP = {
  fort: (skill, lang) => `You design "Square One", a retro dungeon game where a fort IS a learning roadmap for the skill: "${skill}".
Write all text in ${LANGNAME[lang]}.
Return ONLY JSON, no prose:
{"ok":true,"fortName":"evocative 2-4 word fort name","floors":[{"name":"2-4 words","parMinutes":integer}],"rooms":[{"title":"max 6 words, an action","why":"max 16 words: why it matters"}]}
Rules: exactly 4 floors (beginner to project stages) and exactly 20 rooms in learning order, 5 per floor. Room 1 is a tiny first step anyone can finish on a phone in under 2 minutes. Room 20 is a small real project using everything. parMinutes = realistic total minutes for that floor's 5 steps (5 to 240).
If the "skill" is harmful, sexual, hateful, gibberish or not learnable, return {"ok":false}.`,
  warm: (skill, lang) => `For a learner of "${skill}", write 3 quick multiple-choice warm-up questions: easy, medium, harder, all about fundamentals someone past the very first stage would know.
Write in ${LANGNAME[lang]}. Return ONLY JSON: {"ok":true,"questions":[${QSHAPE}, ...3 total]}. If "${skill}" is harmful or not a learnable skill, return {"ok":false}.`,
  room: (fort, n, lang) => {
    const r = fort.rooms[n - 1];
    return `Skill: "${fort.skill}". Roadmap: ${fort.rooms.map((x, i) => (i + 1) + '. ' + x.title).join('; ')}.
Write room ${n}: "${r.title}" (${r.why}). Language: ${LANGNAME[lang]}.
Return ONLY JSON: {"steps":["3 to 5 concrete actions to do right now, max 14 words each, code in backticks"],"doneWhen":"one observable sentence","video":"3-6 word YouTube search for one beginner video on this exact step, in English","minutes":integer,"monster":{"name":"funny 2-3 word monster named after the most common mistake on this step, like Off-by-One Imp","q":"question that catches that mistake","a":["4 short distinct answers"],"c":INDEX_0_TO_3,"fix":"one-line fix, max 14 words"}}
${n === 1 ? 'Room 1 must take under 2 minutes on a phone; make the monster question the easiest in the game.' : ''}${n === 20 ? 'This is the final project; the question checks the project works.' : ''}`;
  },
  extras: (fort, lang) => `Skill: "${fort.skill}". Roadmap rooms: ${fort.rooms.map((x, i) => (i + 1) + '. ' + x.title).join('; ')}.
Language: ${LANGNAME[lang]}. Each question uses this shape: ${QSHAPE}
Return ONLY JSON:
{"secrets":[{"questions":[3 questions on rooms 3-7]},{"questions":[3 questions on rooms 12-16]}],
"elites":[{"name":"elite monster name","q":...,"a":[...],"c":0,"fix":"..."} testing the classic mistake of room 7, {same, testing room 9}],
"bosses":[{"name":"boss name","questions":[2 questions mixing rooms 1-5]},{"name":"...","questions":[2 on rooms 6-10]},{"name":"...","questions":[2 on rooms 11-15]},{"name":"final boss","questions":[3 checking the room 20 project]}]}`
};
const vFort = (j, skill, lang) => {
  if (!j || j.ok === false) { const e = new Error('refused'); e.message = 'refused'; throw e; }
  const fortName = str(j.fortName, 40); if (!fortName || !Array.isArray(j.floors) || j.floors.length < 4 || !Array.isArray(j.rooms) || j.rooms.length < 20) return null;
  const floors = j.floors.slice(0, 4).map(f => ({ name: str(f && f.name, 40) || 'Floor', parMinutes: clamp(Number(f && f.parMinutes) || 20, 5, 240) }));
  const rooms = j.rooms.slice(0, 20).map(r => ({ title: str(r && r.title, 60), why: str(r && r.why, 160) || '' }));
  if (rooms.some(r => !r.title)) return null;
  return { id: 'f' + Date.now().toString(36), skill, lang, fortName, floors, rooms: rooms.map(r => ({ title: r.title, why: r.why, content: null })), warm: null, extras: null };
};
const vWarm = (j) => { if (!j || j.ok === false) throw Object.assign(new Error('refused'), { message: 'refused' }); const qs = (j.questions || []).map(vQ).filter(Boolean); return qs.length >= 3 ? qs.slice(0, 3) : null; };
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
const basicRoom = (fort, n) => {
  const r = fort.rooms[n - 1];
  return { basic: true, steps: [`Search YouTube for "${fort.skill} ${r.title}" and pick a short beginner video`, 'Watch once, pausing to copy each step yourself', 'Try it again without the video', 'Say out loud what you just learned in one sentence'], doneWhen: `You can do "${r.title}" once without help.`, video: `${fort.skill} ${r.title} beginner`, minutes: 10,
    monster: { name: 'Shortcut Shade', q: 'You get stuck halfway through this step. Best next move?', a: ['Rewatch that part, then try it yourself', 'Skip to the next room', 'Copy an answer without trying', 'Give up for today'], c: 0, fix: 'Short retries beat skipping; the struggle is what makes it stick.' } };
};

// ---------- Game ----------
function Game(canvas, onUI) {
  this.onUI = onUI; this.store = new Store();
  this.renderer = new SQ.Renderer(canvas); this.canvas = canvas;
  this.sound = new SQ.Sound();
  this.screen = 'boot'; this.overlay = null; this.bootInfo = { pct: 0, label: '', ready: false };
  this.keys = {}; this.cam = { x: 5.5, y: 6.5, a: -Math.PI / 2 };
  this.time = 0; this.fx = { time: 0, bob: 0, hurt: 0, good: 0, fade: 1, shake: 0, recoil: 0, viewFlash: 0 };
  this.toasts = []; this.toastId = 0; this.banner = null; this.fight = null; this.term = null; this.stats = null; this.build = null;
  this.weapon = 'ember'; this.walkPhase = 0; this.manualUntil = 0; this.timers = []; this.reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  this.contentReq = {}; this.extrasReq = null; this.dirty = true; this.lastEmit = 0;
  this.profile = { lang: 'en', streak: 0, lastDay: null, settings: { music: true, sfx: true, glide: true, ytKey: '' } };
  this.fort = null; this.run = null; this.world = null; this.rm = null; this.secretOffered = false; this.confirmErase = false;
  this._bind();
}
const G = Game.prototype;
G.t = function (k, v) { return tr(this.profile.lang, k, v); };
G.later = function (ms, fn) { const id = setTimeout(() => { this.timers = this.timers.filter(x => x !== id); fn(); }, ms); this.timers.push(id); return id; };
G.clearTimers = function () { this.timers.forEach(clearTimeout); this.timers = []; };
G.emit = function () { this.dirty = true; };
G.toast = function (text, kind, ms) { const id = ++this.toastId; this.toasts.push({ id, text, kind: kind || 'info', until: performance.now() + (ms || 2200) }); if (this.toasts.length > 4) this.toasts.shift(); this.emit(); };

G.boot = async function () {
  const step = async (pct, key, fn) => { this.bootInfo = { pct, label: this.t(key), ready: false }; this.dirty = true; this.lastEmit = 0; this.flush(); await new Promise(r => setTimeout(r, 40)); if (fn) await fn(); };
  await step(8, 'boot1', () => this.loadProfile());
  await step(24, 'boot2', () => withTimeout(Promise.all(['16px "Press Start 2P"', '16px "Atkinson Hyperlegible"', '16px "IBM Plex Mono"'].map(f => document.fonts ? document.fonts.load(f) : 0)), 3500).catch(() => { }));
  await step(48, 'boot3', () => SQ.buildTextures());
  await step(72, 'boot4', () => SQ.buildSprites());
  await step(90, 'boot5', () => { this.loadGame(); this.sound.music = this.profile.settings.music; this.sound.sfx = this.profile.settings.sfx; });
  this.world = this.makeWorld(1, { attract: true });
  this.bootInfo = { pct: 100, label: this.t('boot6'), ready: true }; this.emit();
  this.last = performance.now(); this.lastRaf = this.last; requestAnimationFrame(this._loop);
  setInterval(() => { const t = performance.now(); if (t - this.lastRaf > 250) this.step(t); }, 33);
};
G.resize = function (cw, ch) {
  if (!(cw > 0 && ch > 0)) return;
  const [w, h] = SQ.Renderer.fit(cw, ch);
  if (this.renderer.resize(w, h) && this.world && SQ.assets.brick) { try { this.renderer.render(this.world, this.cam, this.fx); } catch (e) { } }
};
G.isFs = function () { return !!(document.fullscreenElement || document.webkitFullscreenElement); };
G.canFs = function () { const el = document.documentElement; return !!((document.fullscreenEnabled || document.webkitFullscreenEnabled) && (el.requestFullscreen || el.webkitRequestFullscreen)); };
G.toggleFullscreen = function (wantOn) {
  try {
    const d = document, el = d.documentElement, on = this.isFs();
    if (on && wantOn !== true) { const ex = d.exitFullscreen || d.webkitExitFullscreen; if (ex) { const p = ex.call(d); if (p && p.catch) p.catch(() => { }); } }
    else if (!on && this.canFs()) { const req = el.requestFullscreen || el.webkitRequestFullscreen; const p = req.call(el, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => { }); }
  } catch (e) { }
  this.emit();
};
G.enter = function () {
  if (this.screen !== 'boot' || !this.bootInfo.ready) return;
  this.sound.init(); this.sound.startMusic(); this.sound.play('ui'); this.toggleFullscreen(true);
  this.screen = 'title'; this.emit();
};

// ---------- persistence ----------
G.loadProfile = function () {
  try { const p = JSON.parse(this.store.get(KP) || 'null'); if (p && typeof p === 'object') { this.profile = Object.assign(this.profile, p); this.profile.settings = Object.assign({ music: true, sfx: true, glide: true, ytKey: '' }, p.settings || {}); } } catch (e) { this.store.del(KP); }
  if (!SQ.I18N[this.profile.lang]) this.profile.lang = 'en';
};
G.saveProfile = function () { this.store.set(KP, JSON.stringify(this.profile)); };
G.loadGame = function () {
  const raw = this.store.get(KG); if (!raw) return;
  try {
    const g = JSON.parse(raw);
    if (!g || !g.fort || !g.run || !Array.isArray(g.fort.rooms) || g.fort.rooms.length !== 20 || !(g.run.room >= 1 && g.run.room <= 20)) throw new Error('bad');
    this.saved = g;
  } catch (e) { this.store.del(KG); this.saved = null; this.pendingToast = 'saveCorrupt'; }
};
G.save = function () {
  if (!this.fort || !this.run) return;
  const ok = this.store.set(KG, JSON.stringify({ fort: this.fort, run: this.run }));
  this.saved = { fort: this.fort, run: this.run };
  if (!ok && !this.warnedSave) { this.warnedSave = true; this.toast(this.t('noSave'), 'warn', 3500); }
};
G.touchStreak = function () {
  const d = today(), p = this.profile;
  if (p.lastDay !== d) { p.streak = p.lastDay && dayDiff(p.lastDay, d) === 1 ? (p.streak || 0) + 1 : 1; p.lastDay = d; this.saveProfile(); }
  if (p.streak >= 3) this.award('bStreak');
};

// ---------- title actions ----------
G.setLang = function (l) { if (!SQ.I18N[l]) return; this.profile.lang = l; this.saveProfile(); this.sound.play('ui'); this.emit(); };
G.startSkill = function (skill) {
  skill = String(skill || '').trim().slice(0, 60);
  if (!skill) { this.titleError = 'errEmpty'; this.emit(); return; }
  if (!aiOk()) { if (/python/i.test(skill)) return this.startBuild(null, true); this.titleError = 'aiOff'; this.emit(); return; }
  this.titleError = null; this.startBuild(skill, false);
};
G.playSample = function () { this.titleError = null; this.startBuild(null, true); };
G.continueGame = function () {
  if (!this.saved) return;
  this.fort = this.saved.fort; this.run = this.saved.run; this.sanitizeRun();
  this.touchStreak(); this.screen = 'play';
  if (this.run.review) this.enterRoom(this.run.review.to, { review: this.run.review }); else this.enterRoom(this.run.room);
};
G.demo14 = function () {
  const fort = this.prepSample();
  const run = this.newRun(fort, 14);
  for (let i = 0; i < 13; i++) run.status[i] = 'done';
  run.score = 12850; run.floors = [{ monsters: 7, firstTry: 6, secrets: 0, time: 640, wrongs: 1, score: 4200 }, { monsters: 7, firstTry: 7, secrets: 0, time: 980, wrongs: 0, score: 5100 }, { monsters: 3, firstTry: 3, secrets: 0, time: 410, wrongs: 0, score: 3550 }, { monsters: 0, firstTry: 0, secrets: 0, time: 0, wrongs: 0, score: 0 }];
  run.badges = ['bFirst', 'bUntouch'];
  this.fort = fort; this.run = run; this.touchStreak(); this.save(); this.screen = 'play'; this.enterRoom(14);
};
G.eraseSave = function () {
  if (!this.confirmErase) { this.confirmErase = true; this.emit(); this.later(3000, () => { this.confirmErase = false; this.emit(); }); return; }
  this.confirmErase = false; this.store.del(KG); this.saved = null; this.sound.play('thud');
  if (this.screen !== 'title') this.quitToTitle(true); else this.emit();
};
G.prepSample = function () {
  const f = clone(SQ.SAMPLE); f.id = 'sample-' + Date.now().toString(36);
  f.rooms = f.rooms.map(r => ({ title: r.title, why: r.why, content: r.content }));
  f.lang = this.profile.lang; return f;
};
G.newRun = function (fort, start) {
  const run = { fortId: fort.id, room: start, status: Array(20).fill(null), rs: {}, score: 0, streak: 0, health: 100, floors: [0, 1, 2, 3].map(() => ({ monsters: 0, firstTry: 0, secrets: 0, time: 0, wrongs: 0, score: 0 })), badges: [], secretTried: {}, eliteBeaten: {}, portalUsed: {}, review: null, totalTime: 0, started: Date.now() };
  for (let i = 0; i < start - 1; i++) run.status[i] = 'skip';
  return run;
};
G.sanitizeRun = function () {
  const r = this.run; r.rs = r.rs || {}; r.floors = r.floors || this.newRun(this.fort, 1).floors; r.badges = r.badges || []; r.secretTried = r.secretTried || {}; r.eliteBeaten = r.eliteBeaten || {}; r.portalUsed = r.portalUsed || {};
  r.health = clamp(Number(r.health) || 100, 1, 100); r.score = Number(r.score) || 0; r.streak = Number(r.streak) || 0;
  if (!Array.isArray(r.status) || r.status.length !== 20) r.status = Array(20).fill(null).map((_, i) => i < r.room - 1 ? 'done' : null);
};

// ---------- build + warm-up ----------
G.startBuild = function (skill, sample) {
  this.clearTimers(); this.sound.play('ui');
  const id = this.buildId = (this.buildId || 0) + 1, lang = this.profile.lang, alive = () => this.buildId === id && this.screen === 'build';
  const B = this.build = { skill: sample ? 'Python' : skill, sample, steps: ['b1', 'b2', 'b3', 'b4', 'b5'].map((k, i) => ({ key: k, state: i ? 'wait' : 'active' })), failed: false, fort: null, ready: false, t0: performance.now(), warmState: 'loading', warmRight: 0, warmDone: false, errKey: null };
  this.screen = 'build'; this.overlay = null; this.fight = null; this.rm = null;
  this.world = this.makeWorld(0, { warm: true }); this.cam = { x: 5.5, y: 8.2, a: -Math.PI / 2 };
  this.fadeIn();
  const mark = (i) => { B.steps.forEach((s, j) => s.state = j <= i ? 'done' : j === i + 1 ? 'active' : 'wait'); this.emit(); };
  const fortP = sample ? new Promise(r => setTimeout(() => r(this.prepSample()), 450)) : askAI(AIP.fort(skill, lang), j => vFort(j, skill, lang), 2, 60000);
  const warmP = sample ? new Promise(r => setTimeout(() => r(clone(SQ.SAMPLE.warm)), 700)) : askAI(AIP.warm(skill, lang), vWarm, 2, 30000);
  warmP.then(qs => { if (!alive()) return; B.warmQs = qs; B.warmState = 'ready'; this.startDummies(); }).catch(() => { if (!alive()) return; B.warmState = 'none'; B.warmDone = true; this.toast(this.t('noDummies'), 'info', 3000); this.maybeFinishWarm(); });
  fortP.then(async fort => {
    if (!alive()) return; mark(0);
    await new Promise(r => setTimeout(r, 250)); if (!alive()) return; mark(1);
    B.fort = fort; this.fort = fort;
    if (!sample) { this.loadExtras(fort); }
    const first = this.ensureContent(1).catch(() => null);
    this.ensureContent(6).catch(() => null);
    await Promise.race([first, new Promise(r => setTimeout(r, sample ? 300 : 20000))]);
    if (!alive()) return; mark(2);
    await new Promise(r => setTimeout(r, 220)); if (!alive()) return; mark(4);
    B.ready = true; this.emit(); this.maybeFinishWarm();
  }).catch(e => { if (!alive()) return; B.failed = true; B.errKey = e && e.message === 'refused' ? 'errBad' : 'buildFail'; this.overlay = null; this.fight = null; this.sound.play('thud'); this.emit(); });
  this.emit();
};
G.retryBuild = function () { if (!this.build) return; this.startBuild(this.build.skill, this.build.sample); };
G.startDummies = function () {
  const B = this.build; B.dummy = 0;
  const pos = [[3.7, 4.4], [5.5, 3.6], [7.3, 4.4]];
  this.world.sprites = this.world.sprites.filter(s => !s.dummy);
  B.dummies = pos.map(([x, y], i) => { const s = { x, y, tex: SQ.assets.dummy, scale: 0.7, z: 0, dummy: true, rise: 0, idx: i }; this.world.sprites.push(s); this.burst(x, y, 0.4, [220, 190, 140], 10); return s; });
  this.sound.play('whoosh');
  this.later(500, () => this.dummyFight());
};
G.dummyFight = function () {
  const B = this.build; if (!B || this.screen !== 'build' || B.failed) return;
  if (B.dummy >= 3) { B.warmDone = true; this.fight = null; this.overlay = null; this.emit(); this.maybeFinishWarm(); return; }
  this.openFight({ kind: 'dummy', name: this.t('dummy') + ' ' + (B.dummy + 1) + '/3', qs: [B.warmQs[B.dummy]], target: B.dummies[B.dummy] });
};
G.maybeFinishWarm = function () {
  const B = this.build; if (!B || !B.warmDone || this.screen !== 'build') { this.emit(); return; }
  if (!B.ready) { this.emit(); return; }
  if (B.finishing) return; B.finishing = true;
  const all = B.warmRight === 3;
  if (B.warmState === 'ready') this.toast(all ? this.t('warmAll') : this.t('warmSome', { n: B.warmRight }), all ? 'good' : 'info', 2400);
  this.later(1400, () => {
    if (this.screen !== 'build') return;
    this.fort = B.fort; this.run = this.newRun(B.fort, all ? 6 : 1); this.touchStreak(); this.save();
    this.screen = 'play'; this.build = null; this.sound.play(all ? 'door' : 'whoosh');
    this.enterRoom(this.run.room, { lift: all });
  });
};
G.backToTitle = function () { this.buildId++; this.quitToTitle(true); };

// ---------- content ----------
G.ensureContent = function (n) {
  const fort = this.fort; if (!fort || n < 1 || n > 20) return Promise.resolve(null);
  const r = fort.rooms[n - 1]; if (r.content) return Promise.resolve(r.content);
  const key = fort.id + ':' + n; if (this.contentReq[key]) return this.contentReq[key];
  if (!aiOk()) return Promise.reject(new Error('noai'));
  const p = askAI(AIP.room(fort, n, fort.lang || this.profile.lang), vRoom, 2, 45000).then(c => { r.content = c; if (this.fort === fort) this.save(); return c; }).finally(() => { if (!r.content) delete this.contentReq[key]; });
  this.contentReq[key] = p; return p;
};
G.loadExtras = function (fort) {
  if (fort.extras || !aiOk()) return Promise.resolve(fort.extras);
  if (this.extrasReq && this.extrasReq.fort === fort) return this.extrasReq.p;
  const p = askAI(AIP.extras(fort, fort.lang || this.profile.lang), vExtras, 2, 70000).then(x => { fort.extras = x; if (this.fort === fort) this.save(); return x; }).catch(() => { this.extrasReq = null; return null; });
  this.extrasReq = { fort, p }; return p;
};
G.findVideo = async function (content) {
  const key = (this.profile.settings.ytKey || '').trim();
  if (!key || !content.video || content.yt !== undefined) return;
  try {
    const q = encodeURIComponent(content.video);
    const s = await withTimeout(fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&safeSearch=strict&videoEmbeddable=true&q=${q}&key=${encodeURIComponent(key)}`).then(r => r.json()), 9000);
    const ids = (s.items || []).map(i => i.id && i.id.videoId).filter(Boolean); if (!ids.length) throw 0;
    const v = await withTimeout(fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${ids.join(',')}&key=${encodeURIComponent(key)}`).then(r => r.json()), 9000);
    const dur = (iso) => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '') || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };
    const target = Math.max(3, Math.min(25, content.minutes || 10)) * 60;
    let best = null, bs = -1e9;
    (v.items || []).forEach(it => { const st = it.statistics || {}, views = +st.viewCount || 0, likes = +st.likeCount || 0, d = dur(it.contentDetails && it.contentDetails.duration); if (d < 60) return; const sc = Math.log10(views + 10) * 1.2 + Math.min(0.08, likes / (views + 1)) * 30 - Math.abs(Math.log((d + 60) / (target + 60))) * 1.6; if (sc > bs) { bs = sc; best = { id: it.id, title: (it.snippet && it.snippet.title) || '', channel: (it.snippet && it.snippet.channelTitle) || '', views, d }; } });
    content.yt = best || null;
  } catch (e) { content.yt = null; }
  this.save(); this.emit();
};

// ---------- world ----------
G.makeWorld = function (n, opt) {
  opt = opt || {};
  const A = SQ.assets, map = LAYOUT.map(r => r.split(''));
  const key = SQ.KEYS[(Math.max(1, n) - 1) % 5];
  if (opt.warm) { map[0][5] = 'E'; map[5][0] = 'L'; map[5][10] = 'L'; }
  else {
    map[0][5] = BOSS_ROOMS.includes(n) ? 'E' : 'D';
    const secret = SECRET_ROOMS.includes(n) && !opt.review && this.run && !this.run.secretTried[n] && !opt.attract;
    map[5][10] = secret ? 'C' : 'L';
  }
  const f = opt.warm ? -1 : floorOf(Math.max(1, n));
  const w = { n, map, sprites: [], particles: [], doorOpen: 0, doorTarget: 0, brick: A.brick, brickDark: A.brickDark, torch: A.torch, term: A.term, crack: A.crack, lift: A.lift, sky: A.sky, door: A.doors[key.id], doorGlow: SQ.util.hx(key.hex), floorTex: f < 0 ? A.floorWarm : A.floors[f], key, lights: [] };
  this.relight(w);
  return w;
};
G.relight = function (w) {
  const L = [], map = w.map;
  for (let y = 0; y < map.length; y++) for (let x = 0; x < map[0].length; x++) {
    const ch = map[y][x];
    const inX = x === 0 ? 0.7 : x === map[0].length - 1 ? -0.7 : 0, inY = y === 0 ? 0.7 : y === map.length - 1 ? -0.7 : 0;
    if (ch === 'L') L.push({ x: x + 0.5 + inX, y: y + 0.5 + inY, c: [1.0, 0.6, 0.22], rad: 5.6, i: 1.25 });
    if (ch === 'T') L.push({ x: x + 0.5 + inX, y: y + 0.5 + inY, c: [0.3, 0.95, 0.78], rad: 3.6, i: 1.1 });
    if (ch === 'D' || ch === 'E') { const g = ch === 'E' ? [1, .7, .2] : w.doorGlow.map(v => v / 255); L.push({ x: x + 0.5, y: y + 1.1, c: g, rad: 2.6, i: 0.7 + w.doorOpen * 0.8 }); }
    if (ch === 'O') L.push({ x: x - 0.2, y: y + 0.5, c: [0.7, 0.45, 1], rad: 3.5, i: 1.2 });
  }
  w.sprites.forEach(s => { if (s.portal) L.push({ x: s.x, y: s.y, c: [0.7, 0.4, 1.0], rad: 4.2, i: 1.3 }); });
  w.lights = L; w.lm = SQ.buildLightmap(map, L);
};
G.solid = function (x, y) {
  const map = this.world.map; if (y < 0 || x < 0 || y >= map.length || x >= map[0].length) return true;
  const ch = map[y | 0][x | 0];
  if (ch === '.') return false;
  if ((ch === 'D' || ch === 'E') && this.world.doorOpen > 0.85) return false;
  if (ch === 'O') return false;
  return true;
};
G.move = function (dx, dy) {
  const r = 0.24, c = this.cam;
  if (!this.solid(c.x + dx + Math.sign(dx) * r, c.y) && !this.solid(c.x + dx + Math.sign(dx) * r, c.y + r * 0.7) && !this.solid(c.x + dx + Math.sign(dx) * r, c.y - r * 0.7)) c.x += dx;
  if (!this.solid(c.x, c.y + dy + Math.sign(dy) * r) && !this.solid(c.x + r * 0.7, c.y + dy + Math.sign(dy) * r) && !this.solid(c.x - r * 0.7, c.y + dy + Math.sign(dy) * r)) c.y += dy;
  for (const s of this.world.sprites) if (s.block && !s.hidden) { const ddx = c.x - s.x, ddy = c.y - s.y, d = Math.hypot(ddx, ddy); if (d < 0.6 && d > 0.001) { c.x = s.x + ddx / d * 0.6; c.y = s.y + ddy / d * 0.6; } }
};
G.burst = function (x, y, z, col, n) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 2.2; this.world.particles.push({ x, y, z: z + Math.random() * 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 1 + Math.random() * 2.5, c: [clamp(col[0] + (Math.random() * 60 - 30), 0, 255) | 0, clamp(col[1] + (Math.random() * 60 - 30), 0, 255) | 0, clamp(col[2] + (Math.random() * 60 - 30), 0, 255) | 0], size: 0.03 + Math.random() * 0.04, life: 1 }); }
  if (this.world.particles.length > 400) this.world.particles.splice(0, this.world.particles.length - 400);
};
G.fadeIn = function () { this.fx.fade = 0; this.fadeTarget = 1; };
G.transition = function (fn, ms) { if (this.transitioning) return; this.transitioning = true; this.fadeTarget = 0; this.later(ms || 320, () => { this.transitioning = false; fn(); this.fadeTarget = 1; }); };

// ---------- rooms ----------
G.enterRoom = function (n, opt) {
  opt = opt || {}; this.clearTimers(); this.transitioning = false;
  const run = this.run, review = opt.review || null;
  if (!review) { run.room = n; run.review = null; }
  const rs = review ? {} : (run.rs[n] = run.rs[n] || {});
  this.world = this.makeWorld(n, { review });
  this.rm = { n, review, rs, phase: 'toTerm', monster: null, elite: null, key: null, portal: null, boss: BOSS_ROOMS.includes(n) && !review };
  this.cam = { x: SPAWN.x, y: SPAWN.y, a: SPAWN.a };
  this.overlay = null; this.fight = null; this.term = null; this.secretOffered = false; this.manualUntil = 0;
  const elitesTeach = ELITE_ROOMS[n];
  if (elitesTeach && !review && !run.eliteBeaten[n]) {
    const e = this.eliteData(n), type = SQ.monsterType(e ? e.name : 'elite' + n);
    this.rm.elite = { x: 5.5, y: 1.9, frames: SQ.assets.monsters.elite[type], fps: 2.2, scale: 1.1, z: 0, block: true, type, name: e ? e.name : 'Elite', bob: 0 };
    this.world.sprites.push(this.rm.elite);
  }
  if (!review) {
    if (rs.monsterBeaten && !rs.keyTaken) this.dropKey(5.5, 5.0, true);
    else if (rs.monsterBeaten && rs.keyTaken) this.afterKey(true);
  }
  this.fadeIn();
  this.banner = { id: Date.now(), top: review ? this.t('reviewKick') : (opt.lift ? this.t('liftRise', { n: floorOf(n) + 1 }) : this.t('floor') + ' ' + (floorOf(n) + 1) + ' · ' + this.fort.floors[floorOf(n)].name), main: (n === 1 && !review ? 'Square One · ' : this.t('room') + ' ' + n + ' · ') + this.fort.rooms[n - 1].title };
  this.later(2600, () => { this.banner = null; this.emit(); });
  if (!review) this.save(); else { run.review = review; this.save(); }
  this.ensureContent(n).catch(() => { });
  if (n < 20) this.later(1200, () => this.ensureContent(n + 1).catch(() => { }));
  if (this.fort && !this.fort.sample && (n >= 2 || !this.fort.extras)) this.loadExtras(this.fort);
  if (ELITE_ROOMS[n + 1]) this.ensureContent(ELITE_ROOMS[n + 1]).catch(() => { });
  this.emit();
};
G.eliteData = function (n) {
  const ex = this.fort.extras, i = n === 14 ? 0 : 1, teach = ELITE_ROOMS[n];
  if (ex && ex.elites && ex.elites[i]) return ex.elites[i];
  const c = this.fort.rooms[teach - 1].content;
  if (c && c.monster) return Object.assign({}, c.monster, { name: 'Elite ' + c.monster.name, teaches: teach });
  return null;
};
G.bossData = function (n) {
  const f = floorOf(n), ex = this.fort.extras, c = this.fort.rooms[n - 1].content;
  let qs = [c.monster], name = c.monster.name;
  if (ex && ex.bosses && ex.bosses[f]) { qs = qs.concat(ex.bosses[f].questions); name = ex.bosses[f].name || name; }
  else { for (let i = f * 5 + 1; i < n && qs.length < (n === 20 ? 4 : 3); i++) { const cc = this.fort.rooms[i - 1].content; if (cc && cc.monster) qs.push(cc.monster); } }
  return { name, qs: qs.slice(0, n === 20 ? 4 : 3) };
};
G.openTerminal = function () {
  if (this.overlay || !this.rm) return;
  const n = this.rm.n; this.overlay = 'terminal'; this.sound.play('ui');
  this.term = { n, loading: true, error: false };
  const id = this.termId = (this.termId || 0) + 1;
  this.ensureContent(n).then(c => { if (this.termId !== id) return; this.term = { n, content: c }; this.findVideo(c); this.emit(); }).catch(() => { if (this.termId !== id) return; this.term = { n, error: true }; this.emit(); });
  this.emit();
};
G.termRetry = function () { const n = this.term && this.term.n; this.overlay = null; if (n) this.openTerminal(); };
G.termBasic = function () { const n = this.term.n; this.fort.rooms[n - 1].content = basicRoom(this.fort, n); this.save(); this.term = { n, content: this.fort.rooms[n - 1].content }; this.emit(); };
G.closeTerminal = function () {
  if (this.overlay !== 'terminal' || !this.term || !this.term.content) return;
  this.overlay = null; this.term = null; this.sound.play('whoosh');
  const rm = this.rm; rm.termRead = true;
  if (rm.phase === 'toTerm') this.spawnMonster();
  this.emit();
};
G.spawnMonster = function () {
  const rm = this.rm, c = this.fort.rooms[rm.n - 1].content || basicRoom(this.fort, rm.n);
  const name = rm.boss ? this.bossData(rm.n).name : c.monster.name, type = SQ.monsterType(name);
  const A = SQ.assets.monsters;
  rm.monster = { x: 5.5, y: 3.0, frames: rm.boss ? A.boss[type] : A.normal[type], fps: 2.5, scale: rm.boss ? 1.4 : 0.95, z: 0, type, name, appear: 0, block: true };
  if (rm.elite) { rm.monster.x = 4.0; rm.monster.y = 3.2; }
  this.world.sprites.push(rm.monster);
  this.burst(rm.monster.x, rm.monster.y, 0.4, SQ.monsterColor(type), 24);
  this.sound.play(rm.boss ? 'boss' : 'growl');
  rm.phase = 'approach'; this.emit();
};

// ---------- fights ----------
G.openFight = function (f) {
  f.qi = 0; f.busy = false; f.fix = null; f.result = null; f.hits = 0; f.total = f.qs.length;
  this.fight = f; this.prepQ(); this.overlay = 'fight'; this.emit();
};
G.prepQ = function () { const f = this.fight, q = f.qs[f.qi]; f.order = shuffle([0, 1, 2, 3]); f.wrong = []; f.first = true; f.fix = null; f.q = q; };
G.fire = function (i) {
  const f = this.fight; if (!f || f.busy || this.overlay !== 'fight' || f.wrong.includes(i) || i < 0 || i > 3) return;
  f.busy = true; this.weapon = SQ.WEAPONS[i].id; this.sound.play('fire', i);
  this.fx.recoil = 10; this.fx.viewFlash = 0.12;
  const tgt = f.target || { x: this.cam.x + Math.cos(this.cam.a) * 3, y: this.cam.y + Math.sin(this.cam.a) * 3 };
  const orb = { x: this.cam.x + Math.cos(this.cam.a) * 0.4, y: this.cam.y + Math.sin(this.cam.a) * 0.4, z: 0.35, tex: SQ.assets.orbs[this.weapon], scale: 0.12, additive: true, orb: true };
  orb.sx = orb.x; orb.sy = orb.y; orb.tx = tgt.x; orb.ty = tgt.y; orb.t = 0; orb.onHit = () => this.resolve(i);
  this.world.sprites.push(orb); this.emit();
};
G.resolve = function (i) {
  const f = this.fight; if (!f) return;
  const right = f.order[i] === f.q.c, run = this.run, fl = this.rm ? run.floors[floorOf(this.rm.n)] : null, scoring = f.kind !== 'dummy' && f.kind !== 'secret';
  if (right) {
    this.sound.play('pop'); this.fx.good = 0.6;
    if (scoring) {
      run.streak++; const mult = Math.min(5, run.streak), gain = 100 * mult + (f.first ? 50 : 0);
      run.score += gain; fl.score += gain; fl.monsters++; if (f.first) fl.firstTry++;
      this.toast('+' + (100 * mult) + (mult > 1 ? ' ×' + mult : '') + (f.first ? '  ·  ' + this.t('firstTry') : ''), 'good', 1600);
    }
    if (f.kind === 'dummy') this.build.warmRight++;
    f.hits++; f.result = 'right';
    if (f.target) { f.target.flash = 1; this.burst(f.target.x, f.target.y, 0.4, f.target.dummy ? [220, 190, 140] : SQ.monsterColor(f.target.type || 0), 10); }
    if (f.qi + 1 < f.total) { this.later(650, () => { if (this.fight !== f) return; f.qi++; this.prepQ(); f.busy = false; f.result = null; this.emit(); }); }
    else this.later(450, () => this.winFight(f));
  } else {
    this.sound.play('thud'); f.wrong.push(i); f.first = false; f.fix = f.q.fix; f.result = 'wrong';
    if (f.target && !f.target.dummy) { f.target.lunge = 1; }
    if (scoring) {
      run.streak = 0; fl.wrongs++;
      const dmg = Math.max(10, 25 - 3 * Math.min(5, this.profile.streak || 0));
      run.health = Math.max(0, run.health - dmg); this.fx.hurt = 1; this.fx.shake = this.reduced ? 0 : 6;
    }
    if (f.kind === 'dummy') { this.later(1700, () => { if (this.fight !== f) return; this.build.dummy++; this.dummyFight(); }); }
    else if (f.kind === 'secret') { this.later(1600, () => this.secretFail()); }
    else if (f.kind === 'elite') { run.health = Math.max(run.health, 10); this.later(1500, () => this.openPortal(f)); }
    else if (run.health <= 0) { this.later(900, () => { this.overlay = 'fell'; this.fight = null; this.emit(); }); }
    else f.busy = false;
    this.save();
  }
  this.emit();
};
G.winFight = function (f) {
  if (this.fight !== f) return;
  const t = f.target;
  if (f.kind === 'dummy') { t.hidden = true; this.burst(t.x, t.y, 0.4, [220, 190, 140], 30); this.build.dummy++; this.fight = null; this.overlay = null; this.later(350, () => this.dummyFight()); this.emit(); return; }
  if (f.kind === 'secret') return this.secretWin();
  this.fight = null; this.overlay = null;
  const rm = this.rm;
  if (t) { t.hidden = true; this.burst(t.x, t.y, 0.45, SQ.monsterColor(t.type), f.kind === 'boss' ? 80 : 46); }
  if (f.kind === 'boss') { this.run.score += 1000; this.run.floors[floorOf(rm.n)].score += 1000; this.toast(this.t('bossDown'), 'good', 2400); this.sound.play('crash'); }
  if (f.kind === 'elite') {
    this.run.eliteBeaten[rm.n] = true; this.toast(this.t('cleared', { n: rm.n }).replace(/.*/, f.name + ' ✓'), 'good', 1800);
    if (this.run.portalUsed[rm.n]) this.award('bPortal');
    this.openDoor(); this.save(); this.emit(); return;
  }
  if (rm.review) { this.openPortalBack(); this.emit(); return; }
  rm.rs.monsterBeaten = true; this.dropKey(t ? t.x : 5.5, t ? t.y : 4.5); this.save(); this.emit();
};
G.clearAt = function (px, py) { return [[0, 0], [.45, 0], [-.45, 0], [0, .45], [0, -.45], [.32, .32], [-.32, .32], [.32, -.32], [-.32, -.32]].every(([dx, dy]) => !this.solid(px + dx, py + dy)); };
G.freeSpot = function (x, y) {
  if (this.clearAt(x, y)) return [x, y];
  let best = [5.5, 5.5], bd = 1e9; const map = this.world.map;
  for (let ty = 0; ty < map.length; ty++) for (let tx = 0; tx < map[0].length; tx++) if (map[ty][tx] === '.' && this.clearAt(tx + .5, ty + .5)) { const d = Math.hypot(tx + .5 - x, ty + .5 - y); if (d < bd) { bd = d; best = [tx + .5, ty + .5]; } }
  return best;
};
G.dropKey = function (x, y, silent) {
  const rm = this.rm, k = this.world.key; [x, y] = this.freeSpot(x, y);
  rm.key = { x, y, tex: SQ.assets.keys[k.id], scale: 0.18, z: 0.15, keyItem: true };
  this.world.sprites.push(rm.key); rm.phase = 'toKey'; if (!silent) this.sound.play('pickup');
};
G.afterKey = function (silent) {
  const rm = this.rm;
  if (rm.elite && !this.run.eliteBeaten[rm.n]) { rm.phase = 'toElite'; if (!silent) this.sound.play('boss'); }
  else this.openDoor(silent);
  this.emit();
};
G.openDoor = function (silent) { const rm = this.rm; rm.phase = 'toDoor'; this.world.doorTarget = 1; if (!silent) this.sound.play('door'); else this.world.doorOpen = 1; this.relight(this.world); };
G.openPortal = function (f) {
  if (this.fight !== f) return;
  const rm = this.rm, teach = ELITE_ROOMS[rm.n];
  this.fight = null; this.overlay = null; this.run.portalUsed[rm.n] = true;
  rm.reviewInfo = { from: rm.n, to: teach, fix: f.q.fix, q: f.q, name: f.name };
  this.spawnPortal(); rm.phase = 'toPortal';
  this.toast(this.t('portalOpen', { n: teach }), 'warn', 2600); this.save(); this.emit();
};
G.spawnPortal = function () {
  const c = this.cam, cand = [[5.5, 6.5], [5.5, 4.6], [3.5, 6.5], [7.5, 6.5]].find(p => Math.hypot(p[0] - c.x, p[1] - c.y) > 1.6) || [5.5, 4.6];
  this.rm.portal = { x: cand[0], y: cand[1], frames: SQ.assets.portal, scale: 1.0, z: 0, additive: true, portal: true };
  this.world.sprites.push(this.rm.portal); this.relight(this.world); this.sound.play('portal');
};
G.openPortalBack = function () { const rm = this.rm; this.spawnPortal(); rm.phase = 'toPortalBack'; this.toast(this.t('portalOpen', { n: rm.review.from }), 'info', 2200); };
G.restartRoom = function () { this.run.health = 100; this.run.streak = 0; this.overlay = null; this.save(); this.sound.play('whoosh'); const r = this.rm.review; this.enterRoom(r ? r.to : this.rm.n, r ? { review: r } : {}); };
G.award = function (key) {
  if (!this.run || this.run.badges.includes(key)) return;
  this.run.badges.push(key); this.newBadges = (this.newBadges || []).concat(key);
  this.toast(this.t('badge') + ': ' + this.t(key), 'badge', 2800); this.sound.play('badge');
};

// ---------- secrets ----------
G.offerSecret = function () { if (this.overlay || !this.rm || this.world.map[5][10] !== 'C') return; if (['fight', 'approach', 'toPortal', 'toPortalBack'].includes(this.rm.phase)) return; this.overlay = 'secretOffer'; this.secretOffered = true; this.sound.play('ui'); this.emit(); };
G.secretDecline = function () { this.overlay = null; this.emit(); };
G.secretAccept = async function () {
  const n = this.rm.n, i = n === 3 ? 0 : 1;
  let ex = this.fort.extras;
  if (!ex && !this.fort.sample) { this.overlay = 'secretLoading'; this.emit(); ex = await this.loadExtras(this.fort); if (!this.rm || this.rm.n !== n) return; }
  const set = ex && ex.secrets && ex.secrets[i];
  if (!set) { this.overlay = null; this.toast(this.t('wallHolds'), 'info'); this.run.secretTried[n] = true; this.world.map[5][10] = 'L'; this.relight(this.world); this.emit(); return; }
  this.openFight({ kind: 'secret', name: this.t('secretQ'), qs: set.questions, target: { x: CRACK.x - 0.4, y: CRACK.y } });
};
G.secretFail = function () { this.fight = null; this.overlay = null; this.run.secretTried[this.rm.n] = true; this.world.map[5][10] = 'L'; this.relight(this.world); this.toast(this.t('wallHolds'), 'info', 2600); this.save(); this.emit(); };
G.secretWin = function () {
  const rm = this.rm, run = this.run, f = floorOf(rm.n);
  this.fight = null; this.overlay = null; run.secretTried[rm.n] = true;
  run.score += 500; run.floors[f].score += 500; run.floors[f].secrets++;
  this.world.map[5][10] = 'O'; this.relight(this.world); this.burst(CRACK.x - 0.5, CRACK.y, 0.5, [200, 150, 100], 50);
  this.sound.play('secret'); this.toast(this.t('secretFound'), 'good', 2400); this.award('bSecret');
  rm.prevPhase = rm.phase; rm.phase = 'toSecret'; this.save(); this.emit();
};
G.takeSecret = function () {
  const from = this.rm.n, to = Math.min(20, from + 5), run = this.run;
  for (let i = from; i < to; i++) if (run.status[i - 1] !== 'done') run.status[i - 1] = 'skip';
  this.sound.play('portal');
  const crossed = floorOf(from) !== floorOf(to);
  this.transition(() => { if (crossed) this.showStats(floorOf(from), to); else this.enterRoom(to); }, 500);
};

// ---------- floor end ----------
G.exitRoom = function () {
  const rm = this.rm, run = this.run, n = rm.n;
  run.status[n - 1] = 'done'; run.health = Math.min(100, run.health + 15);
  this.award('bFirst');
  this.sound.play('whoosh');
  if (BOSS_ROOMS.includes(n)) { this.transition(() => this.showStats(floorOf(n), n === 20 ? 'victory' : n + 1), 450); }
  else { this.toast(this.t('cleared', { n }), 'good', 1800); this.transition(() => this.enterRoom(n + 1), 380); }
  this.save();
};
G.showStats = function (f, next) {
  const run = this.run, fs = run.floors[f], par = (this.fort.floors[f].parMinutes || 20) * 60;
  if (fs.monsters > 0 && fs.wrongs === 0) this.award('bUntouch');
  if (next === 'victory') this.award('bFort');
  const pct = fs.monsters ? Math.round(fs.firstTry / fs.monsters * 100) : 100;
  const pts = pct + (fs.time <= par ? 30 : fs.time <= par * 1.5 ? 15 : 0) + fs.secrets * 10;
  const rank = pts >= 115 ? 'S' : pts >= 90 ? 'A' : pts >= 65 ? 'B' : 'C';
  this.stats = { f, next, t: 0, lines: [{ key: 'sFirst', to: pct, suf: '%' }, { key: 'sSecrets', to: fs.secrets, suf: '' }, { key: 'sTime', text: fmtTime(fs.time) + ' / ' + fmtTime(par) }, { key: 'sScore', to: fs.score, suf: '' }], rank, badges: (this.newBadges || []).slice(), done: false, ticks: -1 };
  this.newBadges = []; this.overlay = 'stats'; this.fx.fade = 0.25; this.fadeTarget = 0.25;
  this.sound.play('drum'); this.save(); this.emit();
};
G.statsContinue = function () {
  const s = this.stats; if (!s) return;
  if (!s.done) { s.t = 99; return; }
  this.overlay = null; this.stats = null; this.sound.play('ui');
  if (s.next === 'victory') { this.screen = 'victory'; this.world.doorOpen = 1; this.fadeTarget = 0.3; this.store.set(KG, JSON.stringify({ fort: this.fort, run: this.run })); this.emit(); return; }
  this.enterRoom(s.next, { lift: true });
};
G.quitToTitle = function (noSave) {
  if (!noSave) this.save();
  this.clearTimers(); this.overlay = null; this.fight = null; this.term = null; this.stats = null; this.build = null; this.rm = null; this.banner = null;
  this.screen = 'title'; this.world = this.makeWorld(1, { attract: true }); this.cam = { x: 5.5, y: 6.5, a: -Math.PI / 2 }; this.fadeIn();
  this.loadGame(); this.emit();
};
G.newFortFromVictory = function () { this.store.del(KG); this.saved = null; this.quitToTitle(true); };

// ---------- UI toggles ----------
G.togglePause = function () {
  if (this.screen !== 'play' && this.screen !== 'build') return;
  if (this.overlay === 'pause') { this.overlay = this.pausedFrom || null; this.pausedFrom = null; }
  else if (!this.overlay || this.overlay === 'fight' || this.overlay === 'terminal' || this.overlay === 'map') { this.pausedFrom = this.overlay === 'map' ? null : this.overlay; this.overlay = 'pause'; }
  this.sound.play('ui'); this.emit();
};
G.toggleMap = function () {
  if (this.screen !== 'play') return;
  if (this.overlay === 'map') this.overlay = null; else if (!this.overlay) this.overlay = 'map'; else return;
  this.sound.play('ui'); this.emit();
};
G.setSetting = function (k, v) {
  const s = this.profile.settings; s[k] = v; this.saveProfile();
  if (k === 'music') this.sound.setMusic(v); if (k === 'sfx') this.sound.setSfx(v);
  if (k === 'glide' && v) this.manualUntil = 0;
  this.emit();
};
G.toggleMute = function () { const on = !(this.profile.settings.music || this.profile.settings.sfx); this.setSetting('music', on); this.setSetting('sfx', on); };
G.action = function () {
  const a = this.currentAction(); if (!a) return;
  if (a === 'term') this.openTerminal(); else if (a === 'crack') this.offerSecret();
};
G.currentAction = function () {
  if (this.screen !== 'play' || this.overlay || !this.rm) return null;
  const c = this.cam, ph = this.rm.phase;
  if (['fight', 'approach'].includes(ph)) return null;
  if (this.world.map[5][10] === 'C') {
    const d = Math.hypot(CRACK.x - c.x, CRACK.y - c.y), ang = Math.atan2(CRACK.y - c.y, CRACK.x - c.x), da = Math.abs(((ang - c.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (d < 7 && da < 0.6) return 'crack';
  }
  if (Math.hypot(TERM.x - c.x, TERM.y - c.y) < 2.4) return 'term';
  return null;
};

// ---------- input ----------
G._bind = function () {
  const typing = (e) => { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); };
  window.addEventListener('keydown', (e) => {
    if (typing(e)) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (this.screen === 'boot') { if (this.bootInfo.ready) this.enter(); return; }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) && (this.screen === 'play' || this.screen === 'build')) e.preventDefault();
    if (e.repeat && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'q'].includes(k)) return;
    this.keys[k] = true;
    if (k === 'Escape') { if (this.overlay === 'map') this.toggleMap(); else if (this.overlay === 'secretOffer') this.secretDecline(); else this.togglePause(); return; }
    if (this.overlay === 'pause') return;
    if (this.overlay === 'fight' && ['1', '2', '3', '4'].includes(k)) { this.fire(+k - 1); return; }
    if (this.overlay === 'stats' && (k === 'Enter' || k === ' ')) { this.statsContinue(); return; }
    if (this.overlay === 'fell' && (k === 'Enter' || k === ' ')) { this.restartRoom(); return; }
    if (this.overlay === 'terminal' && k === 'Enter' && this.term && this.term.content) { this.closeTerminal(); return; }
    if (k === 'm') this.toggleMap();
    if (k === 'f' && !this.overlay) this.toggleFullscreen();
    if (k === 'g') { this.setSetting('glide', !this.profile.settings.glide); this.toast(this.t('pGlide') + ': ' + this.t(this.profile.settings.glide ? 'on' : 'off'), 'info', 1200); }
    if ((k === 'e' || k === 'Enter') && !this.overlay) this.action();
  });
  window.addEventListener('keyup', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; this.keys[k] = false; });
  window.addEventListener('blur', () => { this.keys = {}; });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => { this.keys = {}; this.emit(); }));
  document.addEventListener('visibilitychange', () => { if (window.__sqNoAutoPause) return; if (document.hidden) { this.keys = {}; if ((this.screen === 'play') && this.overlay !== 'pause' && this.overlay !== 'stats') this.togglePause(); if (this.sound.ctx) this.sound.ctx.suspend().catch(() => { }); } else if (this.sound.ctx && this.screen !== 'boot') this.sound.ctx.resume().catch(() => { }); });
  this._loop = this.loop.bind(this);
};

// ---------- update ----------
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
G.turnTo = function (target, rate, dt) { const d = angDiff(this.cam.a, target); this.cam.a += clamp(d, -rate * dt, rate * dt); return Math.abs(d) < 0.05; };
G.path = function (tx, ty) {
  const map = this.world.map, w = map[0].length, h = map.length, sx = this.cam.x | 0, sy = this.cam.y | 0, gx = clamp(tx | 0, 0, w - 1), gy = clamp(ty | 0, 0, h - 1);
  if (sx === gx && sy === gy) return [[tx, ty]];
  const prev = new Int16Array(w * h).fill(-1), q = [sy * w + sx]; prev[sy * w + sx] = sy * w + sx;
  const free = (x, y) => x >= 0 && y >= 0 && x < w && y < h && (map[y][x] === '.' || (x === gx && y === gy) || (map[y][x] === 'D' || map[y][x] === 'E' || map[y][x] === 'O') && !this.solid(x + .5, y + .5));
  while (q.length) { const c = q.shift(), cx = c % w, cy = (c / w) | 0; if (cx === gx && cy === gy) break; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = cx + dx, ny = cy + dy; if (free(nx, ny) && prev[ny * w + nx] < 0) { prev[ny * w + nx] = c; q.push(ny * w + nx); } }); }
  if (prev[gy * w + gx] < 0) return [[tx, ty]];
  const out = []; let c = gy * w + gx; while (c !== sy * w + sx) { out.unshift([(c % w) + 0.5, ((c / w) | 0) + 0.5]); c = prev[c]; }
  out[out.length - 1] = [tx, ty]; return out;
};
G.glideTo = function (tx, ty, faceA, dt) {
  const p = this.path(tx, ty), [wx, wy] = p.length > 1 && Math.hypot(p[0][0] - this.cam.x, p[0][1] - this.cam.y) < 0.35 ? p[1] : p[0];
  const d = Math.hypot(tx - this.cam.x, ty - this.cam.y);
  if (d < 0.08) { if (faceA != null) this.turnTo(faceA, 3.5, dt); return true; }
  const want = Math.atan2(wy - this.cam.y, wx - this.cam.x); const aligned = this.turnTo(want, 4.2, dt);
  const sp = (Math.abs(angDiff(this.cam.a, want)) < 0.6 ? 2.6 : 0.6) * dt, dd = Math.min(sp, Math.hypot(wx - this.cam.x, wy - this.cam.y));
  this.move(Math.cos(want) * dd, Math.sin(want) * dd); this.walkPhase += dt * 9; return false;
};
G.target = function () {
  const rm = this.rm; if (!rm) return null;
  switch (rm.phase) {
    case 'toTerm': return [TERM.stand.x, TERM.stand.y, TERM.stand.a];
    case 'toKey': return rm.key ? [rm.key.x, rm.key.y, null] : null;
    case 'toElite': return [5.5, 4.4, -Math.PI / 2];
    case 'toPortal': case 'toPortalBack': return rm.portal ? [rm.portal.x, rm.portal.y, null] : null;
    case 'toDoor': return this.world.doorOpen > 0.85 ? [5.5, 0.3, -Math.PI / 2] : [5.5, 1.6, -Math.PI / 2];
    case 'toSecret': return [10.6, 5.5, 0];
  }
  return null;
};
G.update = function (dt) {
  const fx = this.fx, w = this.world;
  fx.time += dt; this.time += dt;
  fx.hurt = Math.max(0, fx.hurt - dt * 2.2); fx.good = Math.max(0, fx.good - dt * 3); fx.shake = Math.max(0, fx.shake - dt * 20); fx.recoil = Math.max(0, fx.recoil - dt * 40); fx.viewFlash = Math.max(0, fx.viewFlash - dt);
  if (this.fadeTarget != null) { fx.fade += clamp(this.fadeTarget - fx.fade, -dt * 3.5, dt * 3.5); }
  // particles & sprites
  for (const p of w.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 6 * dt; if (p.z < 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.6; p.vy *= 0.6; } p.life -= dt * 0.9; }
  if (w.particles.length) w.particles = w.particles.filter(p => p.life > 0);
  for (const s of w.sprites) {
    if (s.flash) s.flash = Math.max(0, s.flash - dt * 4);
    if (s.keyItem) s.z = 0.15 + Math.sin(this.time * 4) * 0.05;
    if (s.orb) { s.t += dt / 0.22; const k = Math.min(1, s.t); s.x = s.sx + (s.tx - s.sx) * k; s.y = s.sy + (s.ty - s.sy) * k; s.z = 0.35 + Math.sin(k * Math.PI) * 0.1; if (k >= 1 && !s.done) { s.done = true; s.hidden = true; s.onHit(); } }
    if (s.lunge) { s.lunge = Math.max(0, s.lunge - dt * 2.5); s.scaleBase = s.scaleBase || s.scale; s.scale = s.scaleBase * (1 + Math.sin(s.lunge * Math.PI) * 0.18); }
    if (s.dummy && this.fight && this.fight.target === s) s.z = Math.abs(Math.sin(this.time * 3)) * 0.03;
  }
  if (w.sprites.length > 30) w.sprites = w.sprites.filter(s => !s.hidden || s.block);
  if (w.doorTarget > w.doorOpen) { w.doorOpen = Math.min(1, w.doorOpen + dt * 1.4); if (w.doorOpen >= 1 || Math.random() < 0.1) this.relight(w); }
  if (this.screen === 'title' || this.screen === 'boot') { const k = this.time * 0.18; this.cam.x = 5.5 + Math.sin(k * 0.7) * 0.5; this.cam.y = 7.8 + Math.cos(k * 0.5) * 0.4; this.cam.a = -Math.PI / 2 + Math.sin(k) * 0.5; return; }
  if (this.screen === 'victory') { this.cam.x = 5.5; this.cam.y = 8.6; this.cam.a = -Math.PI / 2 + Math.sin(this.time * 0.2) * 0.25; return; }
  if (this.screen === 'build' && this.build && !this.build.slowEmitted && performance.now() - this.build.t0 > 22500) { this.build.slowEmitted = true; this.emit(); }
  if (this.screen === 'build') { if (this.fight && this.fight.target) this.turnTo(Math.atan2(this.fight.target.y - this.cam.y, this.fight.target.x - this.cam.x), 3, dt); return; }
  if (this.screen !== 'play' || !this.rm) return;
  if (this.overlay === 'stats') { this.updateStats(dt); return; }
  if (this.overlay === 'pause' || this.overlay === 'map') return;
  const rm = this.rm, run = this.run;
  run.floors[floorOf(rm.n)].time += dt; run.totalTime += dt;
  if (rm.elite && !rm.elite.hidden) rm.elite.z = Math.abs(Math.sin(this.time * 2.2)) * 0.04;
  // fights: face target
  if (this.overlay === 'fight' && this.fight && this.fight.target) { const t = this.fight.target; this.turnTo(Math.atan2(t.y - this.cam.y, t.x - this.cam.x), 3, dt); return; }
  if (this.overlay) return;
  // monster approach
  if (rm.phase === 'approach' && rm.monster) {
    const m = rm.monster, dx = this.cam.x - m.x, dy = this.cam.y - m.y, d = Math.hypot(dx, dy);
    this.turnTo(Math.atan2(-dy, -dx), 3, dt);
    if (d > 2.3 || (d > 1.3 && !this.clearAt(m.x, m.y))) { const sp = 1.6 * dt; m.x += dx / d * sp; m.y += dy / d * sp; m.z = Math.abs(Math.sin(this.time * 8)) * 0.05; }
    else { m.z = 0; if (rm.boss) { const b = this.bossData(rm.n); this.openFight({ kind: 'boss', name: b.name, qs: b.qs, target: m }); } else if (rm.review) { const c = this.fort.rooms[rm.n - 1].content || basicRoom(this.fort, rm.n); this.openFight({ kind: 'monster', name: c.monster.name, qs: [c.monster], target: m }); } else { const c = this.fort.rooms[rm.n - 1].content || basicRoom(this.fort, rm.n); this.openFight({ kind: 'monster', name: c.monster.name, qs: [c.monster], target: m }); } }
    return;
  }
  // movement
  const K = this.keys, c = this.cam;
  let fwd = 0, str = 0, rot = 0;
  if (K.w || K.ArrowUp) fwd += 1; if (K.s || K.ArrowDown) fwd -= 1;
  if (K.a) str -= 1; if (K.d) str += 1; if (K.ArrowLeft || K.q) rot -= 1; if (K.ArrowRight || K.e && false) rot += 1;
  const manual = fwd || str || rot;
  if (manual) {
    this.manualUntil = Infinity;
    c.a += rot * 2.6 * dt;
    const sp = 3.2 * dt, dx = Math.cos(c.a) * fwd - Math.sin(c.a) * str, dy = Math.sin(c.a) * fwd + Math.cos(c.a) * str, l = Math.hypot(dx, dy) || 1;
    if (fwd || str) { this.move(dx / l * sp, dy / l * sp); this.walkPhase += dt * 10; }
  } else if (this.profile.settings.glide && this.manualUntil !== Infinity) {
    const tg = this.target();
    if (tg) {
      const d0 = Math.hypot(tg[0] - c.x, tg[1] - c.y), arrived = this.glideTo(tg[0], tg[1], tg[2], dt);
      const gw = this.gw || (this.gw = { t: 0, best: 1e9, key: '' }), key = rm.n + rm.phase + tg[0].toFixed(2) + tg[1].toFixed(2);
      if (gw.key !== key) { gw.key = key; gw.t = 0; gw.best = d0; }
      if (arrived || d0 < gw.best - 0.04) { gw.best = Math.min(gw.best, d0); gw.t = 0; } else gw.t += dt;
      if (gw.t > 1.1) { gw.t = 0; gw.best = 1e9; if (rm.phase === 'toKey' && rm.key) { c.x = rm.key.x; c.y = rm.key.y; } else { const p = this.freeSpot(tg[0], tg[1]); if (!this.solid(tg[0], tg[1]) && this.clearAt(tg[0], tg[1])) { c.x = tg[0]; c.y = tg[1]; } else { c.x = p[0]; c.y = p[1]; } } }
    }
  }
  if (rm.lastPhase !== rm.phase) { rm.lastPhase = rm.phase; this.manualUntil = 0; this.emit(); }
  fx.bob = Math.sin(this.walkPhase) * 1.6;
  // triggers
  if (rm.phase === 'toTerm' && Math.hypot(TERM.x - c.x, TERM.y - c.y) < 1.35 && !rm.termAuto) { rm.termAuto = true; this.openTerminal(); }
  if (rm.phase !== 'toTerm') rm.termAuto = false;
  if (rm.phase === 'toKey' && rm.key && Math.hypot(rm.key.x - c.x, rm.key.y - c.y) < 0.7) { rm.key.hidden = true; rm.key = null; rm.rs.keyTaken = true; this.sound.play('pickup'); this.toast(this.t('oKey', { color: this.t(this.world.key.id) }).replace(/\.$/, '') + ' ✓', 'good', 1400); this.save(); this.afterKey(); }
  if (rm.phase === 'toElite' && rm.elite && Math.hypot(rm.elite.x - c.x, rm.elite.y - c.y) < 2.8) { const e = this.eliteData(rm.n) || basicRoom(this.fort, ELITE_ROOMS[rm.n]).monster; rm.elite.name = e.name; this.openFight({ kind: 'elite', name: e.name, qs: [e], target: rm.elite }); }
  if ((rm.phase === 'toPortal' || rm.phase === 'toPortalBack') && rm.portal && Math.hypot(rm.portal.x - c.x, rm.portal.y - c.y) < 0.55) {
    rm.phase = 'warping'; this.sound.play('portal');
    if (rm.reviewInfo && !rm.review) { const ri = rm.reviewInfo; this.transition(() => this.enterRoom(ri.to, { review: ri }), 700); }
    else if (rm.review) { const from = rm.review.from; this.run.review = null; this.transition(() => this.enterRoom(from), 700); }
  }
  if (rm.phase === 'toDoor' && c.y < 0.75) { rm.phase = 'exiting'; this.exitRoom(); }
  if (rm.phase === 'toSecret' && c.x > 10.2) { rm.phase = 'exiting'; this.takeSecret(); }
  if (w.map[5][10] === 'C' && !this.secretOffered && Math.hypot(CRACK.x - c.x, CRACK.y - c.y) < 1.7 && this.currentAction() === 'crack') this.offerSecret();
  const act = this.currentAction(); if (act !== this.lastAct) { this.lastAct = act; this.emit(); }
};
G.updateStats = function (dt) {
  const s = this.stats; s.t += dt;
  const per = 0.75, n = s.lines.length, total = n * per + 0.6;
  const shown = Math.min(n, Math.floor(s.t / per) + 1);
  if (shown !== s.ticks) { s.ticks = shown; if (shown <= n && shown > 0) this.sound.play('tick', shown * 3); }
  if (s.t >= total && !s.done) { s.done = true; this.sound.play('crash'); }
  this.emit();
};

// ---------- loop ----------
G.loop = function (now) {
  requestAnimationFrame(this._loop);
  this.lastRaf = performance.now();
  this.step(now);
};
G.step = function (now) {
  let dt = (now - this.last) / 1000; this.last = now; if (!(dt > 0)) dt = 0.016; dt = Math.min(dt, 0.05);
  if (this.overlay === 'pause') { this.flush(now); return; }
  this.update(dt);
  if (this.world) {
    const fx = this.fx;
    fx.view = (this.screen === 'play' || this.screen === 'build') ? SQ.assets.view[this.weapon] : null; fx.muzzle = SQ.assets.flash ? SQ.assets.flash[this.weapon] : null;
    fx.viewSway = Math.cos(this.walkPhase * 0.5) * 4;
    this.renderer.render(this.world, this.cam, fx);
  }
  const t = performance.now();
  if (this.toasts.length && this.toasts[0].until < t) { this.toasts = this.toasts.filter(x => x.until > t); this.emit(); }
  this.flush(now);
};
G.flush = function (now) {
  now = now || performance.now();
  if (!this.dirty || now - this.lastEmit < 40) return;
  this.dirty = false; this.lastEmit = now;
  try { this.onUI(this.snapshot()); } catch (e) { console.error(e); }
};

// ---------- snapshot ----------
G.snapshot = function () {
  const t = (k, v) => this.t(k, v), lang = this.profile.lang, s = this.profile.settings, run = this.run, rm = this.rm, fort = this.fort;
  const snap = { fs: this.isFs(), canFs: this.canFs(), screen: this.screen, overlay: this.overlay, lang, hindi: lang === 'hi', s: SQ.I18N[lang], settings: Object.assign({}, s), confirmErase: !!this.confirmErase, touch: this.touch };
  snap.boot = Object.assign({}, this.bootInfo);
  snap.toasts = this.toasts.map(x => ({ id: x.id, text: x.text, kind: x.kind }));
  snap.banner = this.banner;
  if (this.pendingToast && this.screen === 'title') { this.toast(t(this.pendingToast), 'warn', 3500); this.pendingToast = null; }
  if (this.screen === 'title') {
    const sv = this.saved;
    snap.title = { aiOk: aiOk(), error: this.titleError ? t(this.titleError) : null, hasSave: !!sv, saveLabel: sv ? (sv.fort.fortName + ' · ' + t('room') + ' ' + sv.run.room + '/20') : '',
      skills: SQ.SKILLS.map(k => ({ id: k.id, label: k[lang] || k.en })), langs: SQ.LANGS.map(l => ({ id: l.id, label: l.label, active: l.id === lang })) };
  }
  if (this.screen === 'build' && this.build) {
    const B = this.build;
    snap.build = { skill: B.skill, steps: B.steps.map(x => ({ label: t(x.key), done: x.state === 'done', active: x.state === 'active', wait: x.state === 'wait' })), failed: B.failed, err: B.errKey ? t(B.errKey) : '', waiting: B.warmDone && !B.ready, slow: !B.sample && !B.ready && !B.failed && (performance.now() - B.t0) > 22000, dummiesLoading: B.warmState === 'loading', pct: Math.round(B.steps.filter(x => x.state === 'done').length / 5 * 100) };
    snap.obj = { main: t('warmup') + ' — ' + t('warmSub'), sub: B.warmDone ? (B.ready ? '' : t('almost')) : B.warmState === 'loading' ? t('dummies') : t('warmGo') };
  }
  if (this.screen === 'play' && rm && fort) {
    const n = rm.n, f = floorOf(n), key = this.world.key, color = t(key.id), title = fort.rooms[n - 1].title;
    let main = t('oStart', { color, title });
    if (rm.review) main = t('oReview', { n: rm.review.from }) + ' — ' + title;
    const ph = rm.phase; let sub = '';
    const mname = rm.monster ? rm.monster.name : '';
    if (ph === 'toTerm') sub = this.overlay === 'terminal' ? t('oRead') : t('oTerm');
    else if (ph === 'approach' || this.overlay === 'fight') sub = this.fight ? (this.fight.kind === 'boss' ? t('oBoss', { name: this.fight.name, n: this.fight.total }) : this.fight.kind === 'elite' ? t('oElite', { name: this.fight.name }) : t('oFight', { name: this.fight.name })) : t('oFight', { name: mname });
    else if (ph === 'toKey') sub = t('oKey', { color });
    else if (ph === 'toElite') sub = t('oElite', { name: (this.eliteData(n) || {}).name || t('elite') });
    else if (ph === 'toPortal') sub = t('oPortal', { n: ELITE_ROOMS[n] });
    else if (ph === 'toPortalBack') sub = t('oPortal', { n: rm.review.from });
    else if (ph === 'toDoor') sub = BOSS_ROOMS.includes(n) ? (n === 20 ? t('oDoor') : t('oLift', { n: f + 2 })) : t('oDoor');
    else if (ph === 'toSecret') sub = t('oSecret', { n: Math.min(20, n + 5) });
    snap.obj = { main, sub };
    const inFloor = [0, 1, 2, 3, 4].map(i => f * 5 + i + 1);
    const doneN = inFloor.filter(i => run.status[i - 1]).length;
    snap.hud = { health: run.health, healthW: run.health + '%', healthLow: run.health <= 35, armour: this.profile.streak || 0, armourLabel: (this.profile.streak || 0) + ' ' + t((this.profile.streak || 0) === 1 ? 'day' : 'days'), score: run.score.toLocaleString('en-US'), combo: Math.min(5, run.streak), comboOn: run.streak > 1, comboLabel: '×' + Math.min(5, run.streak), floorPct: Math.round(doneN / 5 * 100) + '%', floorLabel: t('floor') + ' ' + (f + 1), roomLabel: (rm.review ? '↺ ' : '') + n + '/20', keys: inFloor.map(i => ({ hex: SQ.KEYS[(i - 1) % 5].hex, on: !!run.status[i - 1] || (i === n && rm.rs.keyTaken), op: (!!run.status[i - 1] || (i === n && rm.rs.keyTaken)) ? 1 : 0.18 })), glide: !!s.glide, muted: !(s.music || s.sfx) };
    const act = this.currentAction(); snap.action = act ? { label: act === 'term' ? t('pTerm') : t('pCrack') } : null;
  }
  if ((this.screen === 'play' || this.screen === 'build') && this.fight) {
    const F = this.fight, q = F.q;
    snap.fight = { name: F.name, kind: F.kind, kindLabel: F.kind === 'boss' ? (rm && rm.n === 20 ? t('tFinal') : t('boss')) : F.kind === 'elite' ? t('elite') : F.kind === 'dummy' ? t('warmup') : F.kind === 'secret' ? t('tSecret') : (rm && rm.review ? t('reviewKick') : t('room') + ' ' + (rm ? rm.n : '')), q: rich(q.q), fix: F.fix ? rich(F.fix) : null, hasFix: !!F.fix, multi: F.total > 1, hitLabel: t('hitOf', { a: Math.min(F.qi + 1, F.total), b: F.total }), pips: Array.from({ length: F.total }, (_, i) => ({ on: i < F.hits })), result: F.result,
      options: F.order.map((oi, i) => { const w = SQ.WEAPONS[i], dis = F.wrong.includes(i) || F.busy; return { i, key: String(i + 1), hex: w.hex, weapon: t(w.id), label: rich(q.a[oi]), off: F.wrong.includes(i), op: F.wrong.includes(i) ? 0.35 : F.busy ? 0.7 : 1, cursor: dis ? 'default' : 'pointer', fire: () => this.fire(i) }; }) };
  } else snap.fight = null;
  snap.weapons = SQ.WEAPONS.map((w, i) => ({ key: String(i + 1), hex: w.hex, name: t(w.id) }));
  if (this.overlay === 'terminal' && this.term) {
    const T = this.term, c = T.content, review = rm && rm.review, r = fort.rooms[T.n - 1];
    snap.term = { loading: !!T.loading, error: !!T.error, ready: !!c, n: T.n, kicker: review ? t('reviewKick') : (T.n === 1 ? 'Square One' : t('room') + ' ' + T.n + ' ' + t('of') + ' 20'), title: r.title, why: r.why, review: !!review, reviewFix: review ? rich(review.fix) : null, reviewQ: review ? rich(review.q.q) : null };
    if (c) {
      snap.term.steps = c.steps.map((x, i) => ({ n: i + 1, segs: rich(x) })); snap.term.doneWhen = rich(c.doneWhen); snap.term.mins = t('mins', { n: c.minutes });
      const qurl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(c.video || (fort.skill + ' ' + r.title));
      snap.term.video = { label: c.video, searchUrl: qurl, hasEmbed: !!(c.yt && c.yt.id), embed: c.yt && c.yt.id ? 'https://www.youtube-nocookie.com/embed/' + c.yt.id + '?rel=0' : '', ytTitle: c.yt ? c.yt.title : '', ytMeta: c.yt ? c.yt.channel + ' · ' + (c.yt.views || 0).toLocaleString('en-US') + ' views · ' + fmtTime(c.yt.d) : '', finding: !!(s.ytKey && c.yt === undefined), basic: !!c.basic };
    }
  }
  if (this.overlay === 'map' && run) {
    const here = rm ? rm.n : run.room;
    snap.map = { fort: fort.fortName, skill: fort.skill, floors: fort.floors.map((fl, fi) => ({ name: t('floor') + ' ' + (fi + 1) + ' · ' + fl.name, rooms: [0, 1, 2, 3, 4].map(k => { const n = fi * 5 + k + 1, st = run.status[n - 1], isHere = n === here, next = !st && n === run.room + 1 && !isHere; const tags = []; if (SECRET_ROOMS.includes(n)) tags.push(t('tSecret')); if (ELITE_ROOMS[n]) tags.push(t('tElite')); if (BOSS_ROOMS.includes(n)) tags.push(n === 20 ? t('tFinal') : t('tBoss'));
      const state = isHere ? t('here') : st === 'done' ? t('done') : st === 'skip' ? t('skipped') : next ? t('next') : t('locked');
      return { n, title: fort.rooms[n - 1].title, tags: tags.join(' · '), hasTags: !!tags.length, state, here: isHere, bg: isHere ? '#ffb22e' : st === 'done' ? '#2d5a3d' : st === 'skip' ? '#2a2f5c' : '#17143a', fg: isHere ? '#1a1030' : '#f5ecd9', border: isHere ? '#ffd88a' : st === 'done' ? '#57d36a' : next ? '#ffb22e' : '#39335f', dot: isHere ? 1 : 0 }; }) })), progress: run.status.filter(Boolean).length + '/20' };
  }
  if (this.overlay === 'stats' && this.stats) {
    const S = this.stats, per = 0.75;
    snap.stats = { title: t('statsTitle', { n: S.f + 1 }), floorName: fort.floors[S.f].name, done: S.done, rank: S.done ? S.rank : '?', rankColor: { S: '#ffc23d', A: '#57d36a', B: '#4fa3ff', C: '#d9a66b' }[S.rank], badges: S.badges.map(b => ({ label: t(b) })), hasBadges: S.done && S.badges.length > 0, cta: S.done ? t('sContinue') : t('sSkip'),
      lines: S.lines.map((L, i) => { const k = clamp((S.t - i * per) / (per * 0.8), 0, 1); return { label: t(L.key), op: k > 0 ? 1 : 0.15, value: k <= 0 ? '—' : L.text ? L.text : Math.round(L.to * k).toLocaleString('en-US') + L.suf }; }) };
  }
  if (this.screen === 'victory' && run) {
    snap.victory = { fort: fort.fortName, sub: t('vSub', { fort: fort.fortName }), score: run.score.toLocaleString('en-US'), time: fmtTime(run.totalTime), badges: run.badges.map(b => ({ label: t(b) })) };
  }
  return snap;
};
SQ.Game = Game;
SQ._loaded = Object.assign(SQ._loaded || {}, { game: true });
})();
