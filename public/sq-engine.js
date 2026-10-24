(function () {
'use strict';
const SQ = window.SQ = window.SQ || {};
if (SQ._loaded && SQ._loaded.engine) return;
const LMR = 8;
const rnd = (seed) => { let s = (seed >>> 0) || 0x9e3779b9; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
const hashStr = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const pack = (r, g, b, a = 255) => (((a & 255) << 24) | ((clamp(b | 0, 0, 255)) << 16) | ((clamp(g | 0, 0, 255)) << 8) | clamp(r | 0, 0, 255)) >>> 0;
const hx = (h) => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const tex = (w, h) => ({ w, h, d: new Uint32Array(w * h) });
const put = (t, x, y, r, g, b, a = 255) => { if (x < 0 || y < 0 || x >= t.w || y >= t.h) return; t.d[y * t.w + x] = pack(r, g, b, a); };
const get = (t, x, y) => { const c = t.d[y * t.w + x]; return [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, c >>> 24]; };
const copyTex = (t) => ({ w: t.w, h: t.h, d: new Uint32Array(t.d) });
const el = (u, v, cu, cv, ru, rv) => { const a = (u - cu) / ru, b = (v - cv) / rv; return a * a + b * b <= 1; };

// ---------- Textures ----------
function brickTex(seed, base) {
  const t = tex(64, 64), R = rnd(seed), shade = {};
  for (let y = 0; y < 64; y++) {
    const row = (y / 16) | 0, off = (row % 2) * 16;
    for (let x = 0; x < 64; x++) {
      const bx = (x + off) % 64, col = (bx / 32) | 0, lx = bx % 32, ly = y % 16, id = row * 4 + col;
      if (shade[id] == null) shade[id] = 0.82 + R() * 0.3;
      if (ly === 15 || lx === 31) { const m = 0.9 + R() * 0.2; put(t, x, y, 74 * m, 50 * m, 40 * m); continue; }
      let s = shade[id] * (0.9 + R() * 0.14);
      if (ly === 0) s *= 1.16; else if (ly === 14) s *= 0.8;
      if (lx === 0) s *= 1.08; else if (lx === 30) s *= 0.88;
      if (R() < 0.035) s *= 0.72;
      put(t, x, y, base[0] * s, base[1] * s, base[2] * s);
    }
  }
  return t;
}
function torchTex(brick, frame) {
  const t = copyTex(brick), R = rnd(77 + frame * 13);
  for (let y = 30; y < 46; y++) for (let x = 29; x < 35; x++) put(t, x, y, 52, 44, 46);
  for (let x = 24; x < 40; x++) for (let y = 26; y < 31; y++) put(t, x, y, y === 26 ? 120 : 70, y === 26 ? 92 : 56, 50);
  for (let y = 4; y < 27; y++) {
    const k = (y - 4) / 22, hw = Math.sin(k * Math.PI * 0.95) * 7 * (0.85 + R() * 0.3) + (frame ? Math.sin(y * 0.9) : Math.cos(y * 0.8)) * 0.8;
    for (let x = Math.round(32 - hw); x <= Math.round(31 + hw); x++) {
      const d = Math.abs(x - 31.5) / Math.max(1, hw), core = (1 - d) * (0.35 + k * 0.9);
      const r = 255, g = clamp(120 + core * 160, 0, 250), b = clamp(20 + core * 150 - (1 - k) * 40, 0, 220);
      put(t, x, y, r, g, b, 254);
    }
  }
  return t;
}
function terminalTex(brick, frame) {
  const t = copyTex(brick), R = rnd(31);
  for (let y = 9; y < 46; y++) for (let x = 8; x < 56; x++) { const edge = y < 11 || y > 43 || x < 10 || x > 53; put(t, x, y, edge ? 70 : 38, edge ? 74 : 42, edge ? 88 : 54); }
  for (let y = 12; y < 42; y++) for (let x = 11; x < 53; x++) {
    const band = ((y + frame * 6) % 12) < 2 ? 1.35 : 1;
    put(t, x, y, 10 * band, 46 * band, 40 * band, 254);
  }
  for (let ry = 15; ry < 38; ry += 4) { const len = 8 + ((R() * 30) | 0); for (let x = 14; x < 14 + len && x < 50; x++) if (R() > 0.12) put(t, x, ry, 111, 242, 200, 254); }
  if (frame) for (let y = 34; y < 38; y++) for (let x = 42; x < 46; x++) put(t, x, y, 160, 255, 220, 254);
  for (let y = 47; y < 56; y++) for (let x = 14; x < 50; x++) put(t, x, y, y === 47 ? 110 : 62, y === 47 ? 112 : 64, y === 47 ? 128 : 78);
  [[19, [255, 178, 46]], [31, [255, 90, 79]], [43, [111, 242, 200]]].forEach(([cx, c]) => { for (let y = 50; y < 53; y++) for (let x = cx; x < cx + 3; x++) put(t, x, y, c[0], c[1], c[2], frame || cx !== 31 ? 254 : 255); });
  return t;
}
function crackTex(brick) {
  const t = copyTex(brick), R = rnd(4242);
  const walk = (x, y, n, dx) => { for (let i = 0; i < n; i++) { put(t, x | 0, y | 0, 30, 18, 14); put(t, (x | 0) + 1, y | 0, 60, 38, 28); if (R() < 0.08 && n > 8) walk(x, y, (n / 2) | 0, -dx); y += 1; x += dx * (R() < 0.5 ? 1 : 0) + (R() < 0.2 ? -dx : 0); } };
  walk(30, 2, 60, 1); walk(18, 10, 30, -1); walk(44, 20, 34, 1);
  for (let i = 0; i < 40; i++) { const x = 20 + R() * 26 | 0, y = 46 + R() * 16 | 0; put(t, x, y, 90, 64, 44); }
  for (let y = 20; y < 44; y++) for (let x = 28; x < 36; x++) if (R() < 0.3) put(t, x, y, 181, 123, 255, 254);
  return t;
}
function doorTex(hex) {
  const t = tex(64, 64), R = rnd(9), k = hx(hex);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const plank = (x / 8) | 0, s = (0.8 + ((plank * 37) % 7) / 20) * (0.9 + R() * 0.15) * (x % 8 === 0 ? 0.6 : 1);
    put(t, x, y, 112 * s, 64 * s, 36 * s);
    if (x < 3 || x > 60 || y < 3) put(t, x, y, 46, 40, 44);
  }
  [[10, 14], [50, 54]].forEach(([a, b]) => { for (let y = a; y < b; y++) for (let x = 3; x < 61; x++) put(t, x, y, y === a ? 120 : 64, y === a ? 116 : 60, y === a ? 120 : 66); for (let x = 7; x < 60; x += 9) put(t, x, a + 1, 190, 180, 160); });
  for (let y = 24; y < 40; y++) for (let x = 26; x < 38; x++) put(t, x, y, 34, 30, 36);
  for (let y = 27; y < 37; y++) for (let x = 29; x < 35; x++) put(t, x, y, k[0], k[1], k[2], 254);
  return t;
}
function liftTex() {
  const t = tex(64, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const bar = x % 8 < 2, s = bar ? 1.25 : 0.75 + (y % 16 === 0 ? 0.3 : 0);
    put(t, x, y, 70 * s, 76 * s, 96 * s);
    if (x < 3 || x > 60 || y < 3 || y > 60) put(t, x, y, 40, 40, 52);
  }
  for (let y = 0; y < 14; y++) for (let x = -y; x <= y; x++) if (y < 10 || Math.abs(x) < 3) put(t, 32 + x, 14 + y, 255, 178, 46, 254);
  return t;
}
function floorTex(hex, seed) {
  const t = tex(32, 32), R = rnd(seed), c = hx(hex);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const lx = x % 16, ly = y % 16;
    let s = 0.9 + R() * 0.14;
    if (lx === 0 || ly === 0) s = 0.45;
    else if (lx === 1 || ly === 1) s *= 1.25;
    else if (lx === 15 || ly === 15) s *= 0.75;
    const d = Math.abs(lx - 8) + Math.abs(ly - 8);
    if (d < 3) s *= 1.45; else if (d === 3) s *= 0.8;
    put(t, x, y, c[0] * s, c[1] * s, c[2] * s);
  }
  return t;
}
function skyTex() {
  const t = tex(512, 100), R = rnd(1999);
  for (let y = 0; y < 100; y++) { const k = y / 99; for (let x = 0; x < 512; x++) put(t, x, y, 6 + k * 52, 6 + k * 26, 24 + k * 54, 254); }
  for (let i = 0; i < 260; i++) { const x = R() * 512 | 0, y = R() * 80 | 0, b = 120 + R() * 135; put(t, x, y, b, b, b * 0.95 + 10, 254); if (R() < 0.06) { put(t, x + 1, y, b * .6, b * .6, b * .6, 254); put(t, x - 1, y, b * .6, b * .6, b * .6, 254); put(t, x, y + 1, b * .6, b * .6, b * .6, 254); put(t, x, y - 1, b * .6, b * .6, b * .6, 254); } }
  const mx = 380, my = 30;
  for (let y = -12; y <= 12; y++) for (let x = -12; x <= 12; x++) { const d = Math.hypot(x, y); if (d < 9.5) { const cr = (Math.hypot(x - 3, y + 2) < 2.5 || Math.hypot(x + 3, y - 3) < 1.8) ? 0.85 : 1; put(t, mx + x, my + y, 248 * cr, 232 * cr, 196 * cr, 254); } else if (d < 12) { const [r, g, b] = get(t, mx + x, my + y); put(t, mx + x, my + y, r + 30, g + 26, b + 18, 254); } }
  return t;
}

// ---------- Sprites ----------
const SHAPES = [
  (u, v) => el(u, v, 0, .64, .56, .3) || el(u, v, 0, .34, .4, .24) || (Math.abs(u) > .2 && Math.abs(u) < .44 && v > .04 && v < .2 && Math.abs(u) - .2 < (.2 - v) * 1.4) || (Math.abs(u) > .16 && Math.abs(u) < .34 && v > .86 && v < .99),
  (u, v) => (v > .32 && el(u, v, 0, .8, .86, .5) && v < .97) || (v > .9 && v < .99 && Math.abs(u) < .92),
  (u, v) => el(u, v, 0, .3, .42, .28) || (v > .28 && v < .9 + .07 * Math.sin(u * 14) && Math.abs(u) < .3 + v * .4),
  (u, v) => el(u, v, 0, .2, .28, .18) || el(u, v, 0, .58, .72, .36) || (v > .4 && v < .74 && Math.abs(u) > .6 && Math.abs(u) < .94) || (v > .86 && Math.abs(u) > .14 && Math.abs(u) < .44),
  (u, v) => (Math.abs(u) < .34 && v > .05 && v < .3) || (Math.abs(u) < .62 && v > .3 && v < .72) || (Math.abs(u) > .62 && Math.abs(u) < .88 && v > .32 && v < .68) || (Math.abs(u) > .14 && Math.abs(u) < .46 && v > .72 && v < .99),
  (u, v) => el(u, v, 0, .36, .64, .33) || (v > .58 && v < .99 && Math.abs(Math.sin(u * 9)) < .5 && Math.abs(u) < .92 - (v - .6) * .5),
  (u, v) => (v > .04 && Math.abs(u) < v * .9 && v < .95) || el(u, v, 0, .24, .32, .2),
  (u, v) => (v < .42 && v > .02 && Math.abs(u) < v * .75) || el(u, v, 0, .58, .38, .22) || el(u, v, 0, .84, .3, .15) || (v > .38 && v < .64 && Math.abs(u) > .38 && Math.abs(u) < .96 && Math.abs(Math.abs(u) - .67) < .3 - (v - .38) * .7)
];
const EYES = [[.32, .15], [.64, .26], [.3, .13], [.2, .1], [.17, .16], [.34, .22], [.24, .1], [.56, .13]];
const MOUTH = [.44, .78, .42, .27, .25, .5, .34, .66];
const PAL = ['#b0302a', '#5a9636', '#8a96c6', '#7c5f34', '#6c7086', '#76389c', '#3c3874', '#a8802c'];
function monsterTex(type, variant, frame) {
  const N = 40, t = tex(N, N), R = rnd(500 + type * 31 + (variant === 'elite' ? 7 : variant === 'boss' ? 13 : 0)), f = SHAPES[type];
  const top = variant === 'normal' ? 1 : 8, span = N - 1 - top, cx = N / 2 - 0.5;
  let base = hx(PAL[type]);
  if (variant === 'elite') base = [base[0] * 0.4 + 112, base[1] * 0.3 + 8, base[2] * 0.4 + 28];
  if (variant === 'boss') base = base.map(v => v * 0.82);
  const on = (x, y) => x >= 0 && y >= top && x < N && y < N && f((x - cx) / (N / 2), (y - top) / span);
  const Y = (v) => Math.round(top + v * span);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!on(x, y)) continue;
    const v = (y - top) / span;
    let s = 1.22 - v * 0.62;
    if (!on(x, y - 1)) s *= 1.3; else if (!on(x, y + 1)) s *= 0.55;
    if (!on(x - 1, y) || !on(x + 1, y)) s *= 0.78;
    if (R() < 0.12) s *= 0.78;
    put(t, x, y, base[0] * s + v * 18, base[1] * s, base[2] * s);
  }
  for (let i = 0; i < 5; i++) { let x = cx + (R() - 0.5) * N * 0.5, y = top + span * (0.42 + R() * 0.4); for (let k = 0; k < 6; k++) { if (on(x | 0, y | 0)) put(t, x | 0, y | 0, base[0] * 0.45 + 30, base[1] * 0.35, base[2] * 0.4); x += R() < 0.5 ? 1 : -1; y += R() < 0.6 ? 1 : 0; } }
  for (let x = 0; x < N; x++) for (let y = top + (span * 0.7 | 0); y < N - 1; y++) if (on(x, y) && !on(x, y + 1) && x % 3 === 0) { put(t, x, y + 1, 232, 222, 196); if (y + 2 < N) put(t, x, y + 2, 170, 158, 130); }
  const oc = variant === 'elite' ? [150, 10, 30, 254] : [10, 4, 12, 255], out = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!on(x, y) && !(t.d[y * N + x] >>> 24) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) out.push([x, y]);
  out.forEach(([x, y]) => put(t, x, y, oc[0], oc[1], oc[2], oc[3]));
  const ev = EYES[type][0], eu = EYES[type][1], ey = Y(ev), eyeC = variant === 'elite' ? [255, 40, 40] : variant === 'boss' ? [255, 140, 20] : [255, 214, 70];
  [-1, 1].forEach(sd => {
    const ex = Math.round(cx + sd * eu * (N / 2));
    for (let y = ey - 2; y <= ey + 1; y++) for (let x = ex - 3; x <= ex + 2; x++) put(t, x, y, 18, 4, 8);
    for (let y = ey - 1; y <= ey; y++) for (let x = ex - 2; x <= ex + 1; x++) { const inner = sd > 0 ? x === ex - 2 : x === ex + 1; if (y === ey - 1 && inner) continue; put(t, x, y, eyeC[0], eyeC[1], eyeC[2], 254); }
    put(t, sd > 0 ? ex : ex - 1, ey, 255, 255, 230, 254);
    for (let k = -3; k <= 2; k++) put(t, ex + k, ey - 4 + Math.round((-sd * k + 3) / 3), 26, 6, 10);
  });
  const my = Y(MOUTH[type]), mh = frame ? 4 : 2, mx0 = Math.round(cx - 5), mx1 = Math.round(cx + 5);
  for (let y = my; y < my + mh; y++) { const taper = mh > 2 && (y === my || y === my + mh - 1) ? 1 : 0; for (let x = mx0 + taper; x <= mx1 - taper; x++) { const deep = y > my && y < my + mh - 1; if (variant === 'boss' && deep) put(t, x, y, 255, 110, 20, 254); else put(t, x, y, deep ? 40 : 76, deep ? 0 : 8, deep ? 8 : 18); } }
  for (let x = mx0 + 1; x <= mx1 - 1; x += 2) { put(t, x, my, 238, 230, 204); if ((x - mx0) % 4 === 1) put(t, x, my + 1, 210, 200, 176); put(t, x + 1, my + mh - 1, 226, 218, 190); }
  if (frame) { put(t, mx0 + 2, my + mh, 190, 220, 170); put(t, mx0 + 2, my + mh + 1, 150, 190, 140); put(t, mx1 - 1, my + mh, 190, 220, 170); }
  if (variant !== 'normal') {
    let y0 = -1; for (let y = 0; y < N && y0 < 0; y++) for (let x = 0; x < N; x++) if (on(x, y)) { y0 = y; break; }
    const row = y0 + 2, xs = []; for (let x = 0; x < N; x++) if (on(x, row)) xs.push(x);
    if (xs.length) { const l = xs[0], r = xs[xs.length - 1], w = r - l;
      [-1, 1].forEach(sd => { const sx = sd < 0 ? l + w * 0.25 : r - w * 0.25; for (let k = 0; k < 9; k++) { const x = Math.round(sx + sd * k * 0.9), y = Math.round(row - k * 0.95 + k * k * 0.03), th = k < 4 ? 2 : 1, s = 1 - k * 0.05; put(t, x - sd, y, 40, 30, 26); for (let q = 0; q < th; q++) put(t, x + q * sd, y, 232 * s, 218 * s, 184 * s); } }); }
  }
  return t;
}
function dummyTex() {
  const t = tex(32, 32), R = rnd(88);
  for (let y = 19; y < 32; y++) for (let x = 15; x < 17; x++) put(t, x, y, 120, 80, 44);
  for (let x = 3; x < 29; x++) put(t, x, 12, 120, 80, 44), put(t, x, 13, 90, 60, 34);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (el(x, y, 16, 13, 9, 11)) { const s = 0.85 + R() * 0.2; put(t, x, y, 200 * s, 166 * s, 110 * s); }
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const d = Math.hypot(x - 16, y - 14); if (d < 6.5) { const ring = (d < 2) || (d >= 4 && d < 6.5); put(t, x, y, ring ? 220 : 250, ring ? 50 : 244, ring ? 50 : 236); } }
  for (let y = 4; y < 24; y += 3) put(t, 9, y, 90, 70, 40);
  return t;
}
function keyTex(hex) {
  const t = tex(16, 12), c = hx(hex);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 16; x++) {
    const edge = x === 0 || y === 0 || x === 15 || y === 11;
    if (edge) put(t, x, y, 20, 18, 28); else if (y === 3 || y === 4) put(t, x, y, 245, 240, 230, 254); else put(t, x, y, c[0], c[1], c[2], 254);
  }
  for (let y = 6; y < 9; y++) for (let x = 2; x < 5; x++) put(t, x, y, 255, 214, 90, 254);
  return t;
}
function orbTex(hex) {
  const t = tex(12, 12), c = hx(hex);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) { const d = Math.hypot(x - 5.5, y - 5.5) / 6; if (d < 1) { const k = 1 - d; put(t, x, y, c[0] * k + 255 * k * k, c[1] * k + 255 * k * k, c[2] * k + 255 * k * k, 254); } }
  return t;
}
function portalTex(frame) {
  const t = tex(32, 48);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) {
    const u = (x - 15.5) / 15, v = (y - 23.5) / 23, r = Math.hypot(u, v);
    if (r < 1) { const a = Math.atan2(v, u), w = Math.sin(a * 3 + r * 9 - frame * Math.PI / 2), k = (1 - r) * 0.6 + 0.4; const c = w > 0.2 ? [180, 110, 255] : w > -0.4 ? [80, 200, 255] : [40, 20, 90]; put(t, x, y, c[0] * k + (1 - r) * 90, c[1] * k + (1 - r) * 60, c[2] * k, 254); }
  }
  return t;
}
function revolverTex(hex) {
  const Wd = 128, Hd = 88, M = new Uint8Array(Wd * Hd), t = tex(Wd, Hd), c = hx(hex), R = rnd(321);
  const inPoly = (x, y, P) => { let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; } return ins; };
  const poly = (P, m, only) => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of P) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(Hd - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(Wd - 1, Math.ceil(x1)); x++) if (inPoly(x + 0.5, y + 0.5, P) && (!only || only.includes(M[y * Wd + x]))) M[y * Wd + x] = m; };
  const ell = (cx, cy, rx, ry, m, only) => { for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(Hd - 1, Math.ceil(cy + ry)); y++) for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(Wd - 1, Math.ceil(cx + rx)); x++) { const a = (x + .5 - cx) / rx, b = (y + .5 - cy) / ry; if (a * a + b * b <= 1 && (!only || only.includes(M[y * Wd + x]))) M[y * Wd + x] = m; } };
  const rect = (x0, y0, x1, y1, m, only) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], m, only);
  poly([[18, 88], [30, 78], [98, 78], [112, 88]], 5);
  poly([[54, 54], [74, 54], [78, 74], [50, 74]], 6);
  poly([[48, 48], [80, 48], [78, 62], [50, 62]], 2);
  ell(64, 45, 22, 11, 1);
  for (let i = -3; i <= 3; i++) { const fx0 = 64 + i * 6; rect(fx0 - 1, 33, fx0 + 1, 57, 2, [1]); }
  for (const i of [-2, 0, 2]) { const gx = 64 + i * 6 + 3; rect(gx - 1, 42, gx + 1, 48, 7, [1]); }
  poly([[57.5, 5], [70.5, 5], [73.5, 38], [54.5, 38]], 1);
  poly([[54.5, 22], [58.5, 22], [57.5, 38], [52.5, 38]], 2);
  poly([[62, 5], [66, 5], [66.8, 37], [61.2, 37]], 3);
  poly([[58.6, 8], [59.6, 8], [58.4, 36], [57.4, 36]], 3, [1]);
  rect(57, 3, 71, 8, 2); rect(61, 4, 67, 7, 10);
  rect(62, 0, 66, 4, 7);
  poly([[58, 48], [70, 48], [68.5, 58], [59.5, 58]], 2);
  poly([[59.5, 56], [68.5, 56], [69.5, 64], [58.5, 64]], 12);
  for (const yy of [58, 60, 62]) rect(59, yy, 69, yy + 1, 3, [12]);
  ell(66, 80, 24, 10, 4);
  ell(50, 72, 5.5, 4.5, 4); ell(59, 70, 5.5, 4.5, 4); ell(68, 70, 5.5, 4.5, 4); ell(77, 72, 5.5, 4.5, 4);
  poly([[35, 68], [47, 57], [56, 54], [59, 60], [47, 71], [38, 76]], 4);
  ell(53.5, 57, 3, 2, 13);
  ell(87, 63, 8, 4, 4); ell(89, 69, 8.5, 4.2, 4); ell(88, 75, 8, 4, 4);
  ell(93, 63, 2.5, 2, 13); ell(95, 69, 2.5, 2, 13); ell(94, 75, 2.5, 2, 13);
  for (const yy of [66, 72]) rect(80, yy, 97, yy + 1, 9, [4]);
  for (const xx of [54, 63, 72]) rect(xx, 69, xx + 1, 74, 9, [4]);
  poly([[20, 88], [28, 84], [104, 84], [112, 88]], 5);
  rect(28, 83, 104, 85, 11);
  const BASE = { 1: [98, 106, 130], 2: [52, 56, 74], 3: [182, 192, 218], 4: [214, 150, 110], 5: [56, 42, 98], 6: [124, 72, 40], 8: [220, 176, 84], 9: [146, 88, 64], 10: [10, 8, 14], 11: [206, 146, 52], 12: [36, 38, 52], 13: [236, 196, 176] };
  const at = (x, y) => (x < 0 || y < 0 || x >= Wd || y >= Hd) ? 0 : M[y * Wd + x];
  for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
    const m = M[y * Wd + x];
    if (!m) { if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) put(t, x, y, 14, 10, 22); continue; }
    if (m === 7) { const k = 0.85 + R() * 0.15; put(t, x, y, c[0] * k + 40, c[1] * k + 40, c[2] * k + 40, 254); continue; }
    let s = 1.16 - (x / Wd) * 0.4;
    if (at(x, y - 1) !== m) s *= 1.22; else if (at(x, y + 1) !== m) s *= 0.74;
    if (at(x - 1, y) !== m || at(x + 1, y) !== m) s *= m === 4 ? 0.78 : 0.86;
    if ((m === 1 || m === 2) && y > 34 && y < 58) s *= 1.12 - ((y - 34) / 24) * 0.42;
    if (m === 6 && x % 3 === 0) s *= 0.85;
    if (m === 4) s *= 1.12 - ((y - 56) / 32) * 0.38;
    s *= 0.96 + R() * 0.08;
    const b = BASE[m]; put(t, x, y, b[0] * s, b[1] * s, b[2] * s);
  }
  t.tipX = 64; t.tipY = 2;
  return t;
}
function flashTex(hex) {
  const N = 40, t = tex(N, N), c = hx(hex);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x - 19.5, dy = y - 19.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const reach = 5 + 14 * Math.pow(Math.abs(Math.cos(a * 4)), 6) + 4 * Math.pow(Math.abs(Math.cos(a * 4 + 0.4)), 10);
    if (r < reach) { const k = 1 - r / reach, w = k * k; put(t, x, y, c[0] * (1 - w) + 255 * w, c[1] * (1 - w) + 255 * w, c[2] * (1 - w) + 230 * w, 254); }
  }
  return t;
}

// ---------- Assets ----------
const A = SQ.assets = SQ.assets || {};
SQ.buildTextures = function () {
  const brick = brickTex(1, [200, 150, 96]);
  A.brick = brick; A.brickDark = brickTex(2, [170, 124, 82]);
  A.torch = [torchTex(brick, 0), torchTex(brick, 1)];
  A.term = [terminalTex(brick, 0), terminalTex(brick, 1)];
  A.crack = crackTex(brick); A.lift = liftTex(); A.sky = skyTex();
  A.floors = ['#2c3188', '#1d6466', '#7a2a3c', '#4a3a8a'].map((h, i) => floorTex(h, 10 + i));
  A.floorWarm = floorTex('#3a2f52', 99);
  A.doors = {};
};
SQ.buildSprites = function () {
  A.monsters = { normal: [], elite: [], boss: [] };
  for (let i = 0; i < 8; i++) ['normal', 'elite', 'boss'].forEach(v => A.monsters[v].push([monsterTex(i, v, 0), monsterTex(i, v, 1)]));
  A.dummy = dummyTex(); A.portal = [0, 1, 2, 3].map(portalTex); A.keys = {}; A.orbs = {}; A.view = {}; A.flash = {};
  (SQ.KEYS || []).forEach(k => { A.keys[k.id] = keyTex(k.hex); A.doors[k.id] = doorTex(k.hex); });
  (SQ.WEAPONS || []).forEach(w => { A.orbs[w.id] = orbTex(w.hex); A.view[w.id] = revolverTex(w.hex); A.flash[w.id] = flashTex(w.hex); });
};
SQ.monsterType = (name) => hashStr(String(name || 'x').toLowerCase()) % 8;
SQ.monsterColor = (type) => hx(PAL[type]);

// ---------- Lightmap ----------
SQ.buildLightmap = function (map, lights) {
  const mw = map[0].length, mh = map.length, w = mw * LMR, h = mh * LMR;
  const r = new Uint16Array(w * h), g = new Uint16Array(w * h), b = new Uint16Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const wx = (x + 0.5) / LMR, wy = (y + 0.5) / LMR;
    let lr = 0.34, lg = 0.3, lb = 0.5;
    for (let i = 0; i < lights.length; i++) { const L = lights[i], d = Math.hypot(wx - L.x, wy - L.y); if (d < L.rad) { const f = (1 - d / L.rad); const k = f * f * L.i; lr += L.c[0] * k; lg += L.c[1] * k; lb += L.c[2] * k; } }
    const j = y * w + x; r[j] = Math.min(560, lr * 256); g[j] = Math.min(560, lg * 256); b[j] = Math.min(560, lb * 256);
  }
  return { w, h, r, g, b };
};

// ---------- Renderer ----------
function Renderer(canvas) { this.cv = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.W = 0; this.H = 0; this.resize(320, 200); }
Renderer.fit = function (vw, vh) { vw = Math.max(1, vw); vh = Math.max(1, vh); const a = clamp(vw / vh, 0.4, 3.2), h = Math.round(Math.sqrt(64000 / a)); return [Math.round(h * a), h]; };
Renderer.prototype.resize = function (w, h) {
  w = clamp(w | 0, 120, 640); h = clamp(h | 0, 100, 420);
  if (w === this.W && h === this.H) return false;
  this.W = w; this.H = h; this.cv.width = w; this.cv.height = h;
  this.img = this.ctx.createImageData(w, h); this.buf = new Uint32Array(this.img.data.buffer); this.zbuf = new Float32Array(w);
  this.plane = clamp(0.66 * (w / h) / 1.6, 0.42, 0.98); this.F = (w / 2) / this.plane * 0.825;
  return true;
};
Renderer.prototype.render = function (world, cam, fx) {
  const W = this.W, H = this.H, HALF = H >> 1, F = this.F, P = this.plane;
  const buf = this.buf, zbuf = this.zbuf, map = world.map, mh = map.length, mw = map[0].length, lm = world.lm, t = fx.time;
  const dirX = Math.cos(cam.a), dirY = Math.sin(cam.a), planeX = -dirY * P, planeY = dirX * P;
  const hz = HALF + (fx.bob || 0) * H / 200 + (fx.shake ? (Math.random() - 0.5) * fx.shake : 0) | 0;
  const flick = 0.94 + Math.sin(t * 13) * 0.03 + Math.sin(t * 7.3) * 0.03;
  const fogK = 0.055;
  const lmAt = (x, y, out) => { let ix = (x * LMR) | 0, iy = (y * LMR) | 0; ix = ix < 0 ? 0 : ix >= lm.w ? lm.w - 1 : ix; iy = iy < 0 ? 0 : iy >= lm.h ? lm.h - 1 : iy; const j = iy * lm.w + ix; out[0] = lm.r[j] * flick; out[1] = lm.g[j] * flick; out[2] = lm.b[j] * flick; };
  const L = [0, 0, 0];
  // floor
  const ft = world.floorTex, fd = ft.d;
  const rx0 = dirX - planeX, ry0 = dirY - planeY, rx1 = dirX + planeX, ry1 = dirY + planeY;
  for (let y = Math.max(hz + 1, 0); y < H; y++) {
    const p = y - hz, rowDist = (0.5 * F) / p;
    const stX = rowDist * (rx1 - rx0) / W, stY = rowDist * (ry1 - ry0) / W;
    let fxp = cam.x + rowDist * rx0, fyp = cam.y + rowDist * ry0;
    const fog = 1 / (1 + rowDist * fogK);
    let o = y * W;
    for (let x = 0; x < W; x++, o++) {
      const tx = ((fxp * 32) | 0) & 31, ty = ((fyp * 32) | 0) & 31, c = fd[ty * 32 + tx];
      lmAt(fxp, fyp, L);
      buf[o] = 0xff000000 | (Math.min(255, ((c >>> 16) & 255) * L[2] * fog >> 8) << 16) | (Math.min(255, ((c >>> 8) & 255) * L[1] * fog >> 8) << 8) | Math.min(255, (c & 255) * L[0] * fog >> 8);
      fxp += stX; fyp += stY;
    }
  }
  // walls + sky
  const sky = world.sky.d;
  for (let x = 0; x < W; x++) {
    const camX = 2 * x / W - 1, rdx = dirX + planeX * camX, rdy = dirY + planeY * camX;
    let mx = cam.x | 0, my = cam.y | 0;
    const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
    let sdx, sdy, stx, sty, side = 0, hit = 0, ch = '1', guard = 0;
    if (rdx < 0) { stx = -1; sdx = (cam.x - mx) * ddx; } else { stx = 1; sdx = (mx + 1 - cam.x) * ddx; }
    if (rdy < 0) { sty = -1; sdy = (cam.y - my) * ddy; } else { sty = 1; sdy = (my + 1 - cam.y) * ddy; }
    while (!hit && guard++ < 64) {
      if (sdx < sdy) { sdx += ddx; mx += stx; side = 0; } else { sdy += ddy; my += sty; side = 1; }
      if (mx < 0 || my < 0 || mx >= mw || my >= mh) { hit = 1; ch = '1'; break; }
      ch = map[my][mx]; if (ch !== '.') hit = 1;
    }
    const dist = Math.max(0.05, side === 0 ? sdx - ddx : sdy - ddy);
    zbuf[x] = dist;
    const lh = Math.max(1, (F / dist) | 0), top = hz - (lh >> 1), dS = Math.max(0, top), dE = Math.min(H - 1, top + lh);
    let wx = side === 0 ? cam.y + dist * rdy : cam.x + dist * rdx; wx -= Math.floor(wx);
    const hxp = cam.x + rdx * (dist - 0.04), hyp = cam.y + rdy * (dist - 0.04);
    // sky above
    const ang = Math.atan2(rdy, rdx), su = ((((ang / (Math.PI * 2)) * 1024) % 512) + 512) % 512 | 0;
    for (let y = 0; y < dS; y++) { const sv = Math.min(99, Math.max(0, (y - (hz - HALF)) * 100 / HALF | 0)); buf[y * W + x] = sky[sv * 512 + su] | 0xff000000; }
    let tx64 = (wx * 64) | 0; if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx64 = 63 - tx64;
    let T = world.brick, open = 0, glow = null;
    if (ch === 'L') T = world.torch[(t * 6 | 0) % 2];
    else if (ch === 'T') T = world.term[(t * 2 | 0) % 2];
    else if (ch === 'C') T = world.crack;
    else if (ch === 'D') { T = world.door; open = world.doorOpen; glow = world.doorGlow; }
    else if (ch === 'E') { T = world.lift; open = world.doorOpen; glow = [255, 178, 46]; }
    else if (ch === 'O') { T = world.crack; open = 1; glow = [181, 123, 255]; }
    else if (ch === 'P') T = world.brickDark;
    lmAt(hxp, hyp, L);
    const fog = 1 / (1 + dist * fogK), sideK = side ? 0.8 : 1;
    const lr = L[0] * fog * sideK, lg = L[1] * fog * sideK, lb = L[2] * fog * sideK;
    const td = T.d, step = 64 / lh;
    let tp = (dS - top) * step;
    for (let y = dS; y <= dE; y++) {
      const v = tp / 64; tp += step;
      let ty = v * 64 | 0;
      if (open > 0) {
        if (v >= 1 - open) { const k = v * 0.5 + 0.15; buf[y * W + x] = 0xff000000 | ((glow[2] * k * 0.5) << 16) | ((glow[1] * k * 0.5) << 8) | (glow[0] * k * 0.5); continue; }
        ty = ((v + open) * 64) | 0;
      }
      ty = ty < 0 ? 0 : ty > 63 ? 63 : ty;
      const c = td[ty * 64 + tx64];
      if ((c >>> 24) === 254) { buf[y * W + x] = c | 0xff000000; continue; }
      buf[y * W + x] = 0xff000000 | (Math.min(255, ((c >>> 16) & 255) * lb >> 8) << 16) | (Math.min(255, ((c >>> 8) & 255) * lg >> 8) << 8) | Math.min(255, (c & 255) * lr >> 8);
    }
  }
  // sprites
  const inv = 1 / (planeX * dirY - dirX * planeY);
  const list = [];
  for (const s of world.sprites) { if (s.hidden) continue; const sx = s.x - cam.x, sy = s.y - cam.y; s._ty = inv * (-planeY * sx + planeX * sy); s._tx = inv * (dirY * sx - dirX * sy); if (s._ty > 0.15) list.push(s); }
  list.sort((a, b) => b._ty - a._ty);
  for (const s of list) {
    const T = s.frames ? s.frames[((t * (s.fps || 8)) | 0) % s.frames.length] : s.tex; if (!T) continue;
    const unit = F / s._ty, sh = unit * s.scale, sw = sh * T.w / T.h;
    const scx = (W / 2) * (1 + s._tx / s._ty), floorY = hz + unit / 2;
    const top = floorY - sh - (s.z || 0) * unit, left = scx - sw / 2;
    const x0 = Math.max(0, left | 0), x1 = Math.min(W - 1, (left + sw) | 0), y0 = Math.max(0, top | 0), y1 = Math.min(H - 1, (top + sh) | 0);
    if (x1 < x0 || y1 < y0) continue;
    lmAt(s.x, s.y, L);
    const fog = 1 / (1 + s._ty * fogK), fl = s.flash || 0;
    const lr = L[0] * fog, lg = L[1] * fog, lb = L[2] * fog, td = T.d, add = s.additive;
    for (let x = x0; x <= x1; x++) {
      if (s._ty >= zbuf[x]) continue;
      const tx = ((x - left) * T.w / sw) | 0; if (tx < 0 || tx >= T.w) continue;
      for (let y = y0; y <= y1; y++) {
        const ty = ((y - top) * T.h / sh) | 0; if (ty < 0 || ty >= T.h) continue;
        const c = td[ty * T.w + tx], a = c >>> 24; if (!a) continue;
        let r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
        if (a !== 254) { r = r * lr >> 8; g = g * lg >> 8; b = b * lb >> 8; }
        if (fl) { r += (255 - r) * fl; g += (255 - g) * fl; b += (255 - b) * fl; }
        const o = y * W + x;
        if (add) { const d = buf[o]; r += d & 255; g += (d >>> 8) & 255; b += (d >>> 16) & 255; }
        buf[o] = 0xff000000 | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r);
      }
    }
  }
  // particles
  for (const p of world.particles) {
    const sx = p.x - cam.x, sy = p.y - cam.y, ty = inv * (-planeY * sx + planeX * sy); if (ty < 0.15) continue;
    const tx = inv * (dirY * sx - dirX * sy), unit = F / ty, px = ((W / 2) * (1 + tx / ty)) | 0;
    if (px < 0 || px >= W || ty >= zbuf[px]) continue;
    const py = (hz + unit / 2 - p.z * unit) | 0, sz = Math.max(1, unit * p.size * Math.max(0.2, p.life) | 0);
    const col = 0xff000000 | (p.c[2] << 16) | (p.c[1] << 8) | p.c[0];
    for (let yy = py; yy < py + sz && yy < H; yy++) if (yy >= 0) for (let xx = px; xx < px + sz && xx < W; xx++) buf[yy * W + xx] = col;
  }
  // viewmodel
  if (fx.view) {
    const V = fx.view, vs = H / 200 * 1.05, dw = V.w * vs | 0, dh = V.h * vs | 0, fl = fx.viewFlash || 0;
    const vx = ((W - dw) / 2 + (fx.viewSway || 0) * vs) | 0, vy = (H - dh + 4 * vs + Math.abs(fx.bob || 0) * vs - (fx.recoil || 0) * vs * 0.9) | 0;
    lmAt(cam.x, cam.y, L);
    const lr = clamp(L[0], 160, 340), lg = clamp(L[1], 150, 320), lb = clamp(L[2], 150, 320);
    for (let y = 0; y < dh; y++) {
      const yy = vy + y; if (yy < 0 || yy >= H) continue; const sy = Math.min(V.h - 1, (y / vs) | 0), row = sy * V.w;
      for (let x = 0; x < dw; x++) {
        const xx = vx + x; if (xx < 0 || xx >= W) continue;
        const c = V.d[row + Math.min(V.w - 1, (x / vs) | 0)], a = c >>> 24; if (!a) continue;
        if (a === 254) { buf[yy * W + xx] = fl ? 0xffffffff : (c | 0xff000000); continue; }
        buf[yy * W + xx] = 0xff000000 | (Math.min(255, ((c >>> 16) & 255) * lb >> 8) << 16) | (Math.min(255, ((c >>> 8) & 255) * lg >> 8) << 8) | Math.min(255, (c & 255) * lr >> 8);
      }
    }
    if (fl > 0 && fx.muzzle) {
      const Mz = fx.muzzle, ms = vs * (0.9 + fl * 3), mw2 = Mz.w * ms | 0, mh2 = Mz.h * ms | 0, mx = (vx + V.tipX * vs - mw2 / 2) | 0, my = (vy + V.tipY * vs - mh2 / 2) | 0;
      for (let y = 0; y < mh2; y++) { const yy = my + y; if (yy < 0 || yy >= H) continue; const sy = Math.min(Mz.h - 1, (y / ms) | 0); for (let x = 0; x < mw2; x++) { const xx = mx + x; if (xx < 0 || xx >= W) continue; const c = Mz.d[sy * Mz.w + Math.min(Mz.w - 1, (x / ms) | 0)]; if (!(c >>> 24)) continue; const d = buf[yy * W + xx]; buf[yy * W + xx] = 0xff000000 | (Math.min(255, ((c >>> 16) & 255) + ((d >>> 16) & 255)) << 16) | (Math.min(255, ((c >>> 8) & 255) + ((d >>> 8) & 255)) << 8) | Math.min(255, (c & 255) + (d & 255)); } }
    }
  }
  // post: hurt tint, fade
  const hurt = fx.hurt || 0, fade = fx.fade == null ? 1 : fx.fade, good = fx.good || 0;
  if (hurt > 0.01 || fade < 0.999 || good > 0.01) {
    const f = Math.max(0, Math.min(1, fade));
    for (let i = 0; i < buf.length; i++) {
      const c = buf[i]; let r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
      if (hurt) { r = r + (255 - r) * hurt * 0.55; g *= 1 - hurt * 0.6; b *= 1 - hurt * 0.6; }
      if (good) { r += (255 - r) * good * 0.25; g += (255 - g) * good * 0.25; b += (255 - b) * good * 0.18; }
      buf[i] = 0xff000000 | ((b * f) << 16) | ((g * f) << 8) | (r * f);
    }
  }
  this.ctx.putImageData(this.img, 0, 0);
};
SQ.Renderer = Renderer;

// ---------- Sound ----------
function Sound() { this.ctx = null; this.music = true; this.sfx = true; this.playing = false; }
Sound.prototype.init = function () {
  try {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = 0.7; this.master.connect(c.destination);
    this.mg = c.createGain(); this.mg.gain.value = this.music ? 0.3 : 0; this.mg.connect(this.master);
    this.sg = c.createGain(); this.sg.gain.value = this.sfx ? 0.8 : 0; this.sg.connect(this.master);
    const nb = this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { this.ctx = null; }
};
Sound.prototype.setMusic = function (on) { this.music = on; if (this.mg) this.mg.gain.setTargetAtTime(on ? 0.3 : 0, this.ctx.currentTime, 0.1); };
Sound.prototype.setSfx = function (on) { this.sfx = on; if (this.sg) this.sg.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05); };
Sound.prototype.osc = function (type, f0, f1, dur, vol, when, dest) {
  const c = this.ctx, t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || this.sg); o.start(t); o.stop(t + dur + 0.03);
};
Sound.prototype.nz = function (dur, vol, ftype, f0, f1, when, dest) {
  const c = this.ctx, t = c.currentTime + (when || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = this.noise; f.type = ftype; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest || this.sg); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
};
Sound.prototype.play = function (name, arg) {
  if (!this.ctx || !this.sfx || this.ctx.state !== 'running') return;
  try {
    switch (name) {
      case 'fire': this.osc('square', 300 + (arg || 0) * 90, 900 + (arg || 0) * 200, 0.16, 0.12); this.nz(0.1, 0.12, 'highpass', 2000); break;
      case 'pop': this.osc('square', 520, 1560, 0.12, 0.16); this.osc('triangle', 1040, 2080, 0.18, 0.12, 0.05); this.nz(0.18, 0.2, 'bandpass', 3000, 600); break;
      case 'thud': this.osc('sine', 140, 38, 0.38, 0.5); this.nz(0.25, 0.3, 'lowpass', 600, 80); break;
      case 'whoosh': this.nz(0.7, 0.28, 'bandpass', 300, 2400); break;
      case 'pickup': [880, 1175, 1760].forEach((f, i) => this.osc('square', f, 0, 0.09, 0.1, i * 0.07)); break;
      case 'secret': [523, 659, 784, 1046, 1318].forEach((f, i) => this.osc('triangle', f, 0, 0.16, 0.14, i * 0.08)); break;
      case 'portal': this.osc('sawtooth', 120, 600, 0.9, 0.08); this.osc('sine', 200, 50, 0.9, 0.2); this.nz(0.9, 0.15, 'bandpass', 200, 3000); break;
      case 'boss': this.osc('sawtooth', 90, 45, 0.8, 0.18); this.nz(0.6, 0.2, 'lowpass', 900, 100); break;
      case 'badge': [784, 988, 1175, 1568].forEach((f, i) => this.osc('square', f, 0, 0.14, 0.09, i * 0.09)); break;
      case 'ui': this.osc('square', 660, 0, 0.05, 0.06); break;
      case 'tick': this.osc('square', 1200 + (arg || 0) * 40, 0, 0.03, 0.05); break;
      case 'drum': for (let i = 0; i < 18; i++) this.nz(0.06, 0.08 + i * 0.006, 'bandpass', 1800, 0, i * 0.045); break;
      case 'crash': this.nz(0.9, 0.3, 'highpass', 4000, 0); this.osc('sine', 110, 55, 0.4, 0.3); break;
      case 'growl': this.osc('sawtooth', 110, 52, 0.75, 0.12); this.osc('square', 82, 40, 0.6, 0.05, 0.06); this.nz(0.6, 0.2, 'lowpass', 520, 110); break;
      case 'step': this.nz(0.05, 0.05, 'lowpass', 400); break;
      case 'door': this.osc('sawtooth', 70, 140, 0.7, 0.06); this.nz(0.7, 0.2, 'bandpass', 400, 1800); break;
    }
  } catch (e) { }
};
const SC = [0, 1, 4, 5, 7, 8, 11, 12, 13, 16, 17, 19];
const LEAD = [[7, -1, 6, -1, 5, -1, 4, -1, 5, -1, 4, 2, 1, -1, 0, -1], [0, -1, 1, -1, 2, -1, 4, -1, 5, 4, 2, -1, 1, -1, -1, -1], [7, -1, 9, -1, 8, 7, 6, -1, 5, -1, 6, 5, 4, -1, 2, -1], [4, -1, 2, 1, 0, -1, 1, -1, 2, -1, 1, -1, 0, -1, -1, -1]];
const ROOT = [0, 5, -4, 0];
Sound.prototype.startMusic = function () {
  if (!this.ctx || this.playing) return; this.playing = true;
  const c = this.ctx, spb = 0.125; let step = 0, next = c.currentTime + 0.1; const D = 146.83;
  const f = (semi) => D * Math.pow(2, semi / 12);
  this._tm = setInterval(() => {
    if (c.state !== 'running') return;
    while (next < c.currentTime + 0.15) {
      const bar = ((step / 16) | 0) % 4, s = step % 16, when = next - c.currentTime;
      const li = LEAD[bar][s]; if (li >= 0 && step % 128 >= 64) this.osc('square', f(SC[li] + 12), 0, 0.2, 0.05, when, this.mg);
      else if (li >= 0 && s % 4 === 0) this.osc('triangle', f(SC[li] + 12), 0, 0.3, 0.05, when, this.mg);
      if (s % 4 === 0) this.osc('triangle', f(ROOT[bar] - 12 + (s % 8 ? 7 : 0)), 0, 0.28, 0.16, when, this.mg);
      if (s % 2 === 0) this.nz(0.03, 0.025, 'highpass', 7000, 0, when, this.mg);
      if (s === 0 || s === 8 || s === 10) this.osc('sine', 120, 40, 0.18, 0.35, when, this.mg);
      if (s === 4 || s === 12) this.nz(0.12, 0.1, 'bandpass', 1600, 0, when, this.mg);
      step++; next += spb;
    }
  }, 30);
};
Sound.prototype.stopMusic = function () { clearInterval(this._tm); this.playing = false; };
SQ.Sound = Sound;
SQ.util = { rnd, hashStr, clamp, hx };
SQ._loaded = Object.assign(SQ._loaded || {}, { engine: true });
})();
