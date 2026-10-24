# AGENTS.md — Square One backend

You are adding a backend to **Square One**, a finished browser game. The frontend is done and **frozen**.
Read this whole file before writing any code. When this file and your own ideas disagree, this file wins.

---

## 0. Hard rules (read twice)

1. **Never edit, rename, reformat or re-save the 5 frozen frontend files.** They must keep these exact SHA-256 hashes:

   | File (in `public/`) | SHA-256 |
   | --- | --- |
   | `Square One.dc.html` | `3d5c99c77921a747828c6b7a09c42577c14faf8f95fcd7377c0334975dff87f1` |
   | `support.js` | `8fe7df74405f3c55f49b7249c74ea1397e65d07dea2b1bd3b4a489bec2e28cbe` |
   | `sq-data.js` | `45cbde26616e52912ec5beb9e3b91bf5c448b6cc2a0617f8641a4854b40c6a4b` |
   | `sq-engine.js` | `479b8856f82fa7612bb6393c80869e62e49d6205ccadd8aa7fcaf8b5fa5da957` |
   | `sq-game.js` | `19b22528b23ed83821b1191653d767fc30bd8bf13b2958c29fbb29a2e113e853` |

   Save these in `frontend.lock.json` and write `scripts/verify-frontend.mjs`, which fails the build if any hash differs. Run it after every phase. Do not let your editor or a formatter touch these files (add them to `.prettierignore` / `.editorconfig` exclusions).
2. **All new browser behaviour goes in one new file, `public/sq-bridge.js`**, which the server adds to the page *at serve time*. The HTML file on disk is never changed.
3. **No scope creep.** Build exactly what this file lists. No login, no new game screens, no UI frameworks, no TypeScript migration, no refactors of things that already work.
4. **Fix, don't redesign.** If you find a bug in the backend or bridge, fix it. If you find a bug in a frozen frontend file, do **not** fix it: add it to `FINDINGS.md` with file, line, what happens, and a suggested fix.
5. **Free services only:** Vercel Hobby, Neon Free Postgres, Google Gemini free API key, YouTube Data API free quota. No Supabase. No Redis. No paid APIs.
6. **The game must keep working with zero settings.** With no env vars at all, the server still serves the game and the offline Python fort works.

---

## 1. What the frozen frontend does (the contract)

It is a Claude Design export: `Square One.dc.html` + a runtime (`support.js`) + 3 game scripts. Facts you can rely on (verified on a real run):

| Need | What the frontend does today | Hook we use |
| --- | --- | --- |
| AI | Calls `window.claude.complete(prompt)` and expects a **string** back. `aiOk()` = `!!(window.claude && typeof window.claude.complete === 'function')`. Only exists inside Claude. | The bridge defines `window.claude.complete`, which POSTs to `/api/ai/complete`. |
| React | `support.js` loads React 18.3.1, ReactDOM 18.3.1 (and, only on demand, Babel 7.29.0) from unpkg.com. Before loading, it looks up each URL in `window.__resources`; if a string is found there, it loads that path instead (no SRI). It also skips loading if `window.React && window.ReactDOM` already exist. | Server sets `window.__resources` to point at `/vendor/*` copies. Our npm copies have exactly the SRI hashes in `support.js` (checked). |
| Saves | Two localStorage keys: `squareone.v1.profile` (lang, streak, lastDay, settings) and `squareone.v1.game` (`{fort, run}`). Uses `localStorage.setItem` / `removeItem` via its `Store` class; if storage is blocked it keeps values in `window.__sq.store.mem`. | The bridge watches `Storage.prototype.setItem/removeItem` for those 2 keys and backs them up to `/api/save`. |
| Game object | `window.__sq` is the live `Game` instance (screen, overlay, fort, run, store, etc.). | Use it in tests (e2e) and as a storage fallback. Never mutate it from the bridge. |
| YouTube | `findVideo()` runs only if `profile.settings.ytKey` is non-empty. It calls `https://www.googleapis.com/youtube/v3/search?...&key=KEY` then `.../videos?...&key=KEY` with `fetch`. | Bridge puts the placeholder key `server` in settings when the server has a key and the player has none, and reroutes those fetches to `/api/youtube/*`. |
| Page insert point | The HTML contains exactly one line `<script src="./support.js"></script>`. | The server inserts the bridge lines **immediately before** it. |

Other verified facts:
- Serving the page at `/` works (the runtime does not need the `.dc.html` path).
- When `window.__resources` is set, `support.js` skips its second fetch of `location.href` (good).
- On load the browser requests `/%7B%7B%20term.video.embed%20%7D%7D` once (raw template iframe). Answer any path starting with `/%7B%7B` or `/{{` with `204`.
- `sq-data.js`, `sq-engine.js`, `sq-game.js` and the Google Fonts CSS are requested twice per visit. Serve them with cache headers (see `vercel.json`).
- The fonts come from Google Fonts; if blocked, the game waits up to 3.5 s then falls back. Leave this alone.

### 1.1 The 4 AI request types (prompts are built by the frontend)

The frontend builds every prompt itself (`AIP` in `sq-game.js` lines 70–92). Classify by these exact patterns; anything that matches none is refused with `400 bad_prompt`:

| Kind | Pattern (JS regex, tested on the start of the prompt) | Frontend waits | Server budget | Model list |
| --- | --- | --- | --- | --- |
| `fort` | `/^You design "Square One", a retro dungeon game where a fort IS a learning roadmap for the skill: "([\s\S]{1,60})"\.\n/` | 60 s ×2 tries | 50 s | main |
| `warm` | `/^For a learner of "([\s\S]{1,60})", write 3 quick multiple-choice warm-up questions/` | 30 s ×2 | 24 s | fast |
| `room` | `/^Skill: "([\s\S]{1,60})"\. Roadmap: [\s\S]+\nWrite room (\d{1,2}): /` | 45 s ×2 | 38 s | main |
| `extras` | `/^Skill: "([\s\S]{1,60})"\. Roadmap rooms: [\s\S]+"secrets":\[/` | 70 s ×2 | 60 s | main |

Also refuse prompts longer than 12,000 characters. Capture group 1 is the skill (store it lowercased + trimmed for stats).

### 1.2 The frontend's own validators (port them exactly)

The server must only cache or return answers that pass these checks. Port this code from `sq-game.js` (lines 52–61 and 93–114) into `lib/validate.js` **without changing its logic**. `clamp` is `(v, a, b) => v < a ? a : v > b ? b : v`.

```js
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
// vFort: if j.ok === false -> REFUSAL. Else needs fortName, floors.length >= 4, rooms.length >= 20, every one of the first 20 rooms has a title.
// vWarm: if j.ok === false -> REFUSAL. Else needs >= 3 questions passing vQ.
// vRoom: steps (strings) >= 2 after cleaning, and monster passing vQ.
// vExtras: any non-null object (entries may be null). Server quality bar: see 3.4.
```
Read the real `vFort`, `vWarm`, `vRoom`, `vExtras` in `sq-game.js` and copy them line for line, adding only the REFUSAL signal (return `{ refusal: true }` instead of throwing).

### 1.3 Reference bridge (tested on the real game)

This prototype ran on the untouched files: the game booted at `/`, built a fort through the server, the terminal and a fight worked, saves arrived, and zero requests went to unpkg. Extend it as section 4 says; keep its shape.

```js
(function () {
  'use strict';
  var cfg = window.__SQ_SERVER || {};
  var KP = 'squareone.v1.profile', KG = 'squareone.v1.game';
  if (cfg.ai && !(window.claude && typeof window.claude.complete === 'function')) {
    window.claude = window.claude || {};
    window.claude.complete = function (prompt) {
      return fetch('/api/ai/complete', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ prompt: String(prompt) }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || typeof j.text !== 'string') throw new Error(j.error || ('ai ' + r.status));
          return j.text; }); });
    };
  }
  if (cfg.sync) {
    var timer = null, lastSent = '';
    var send = function (beacon) { /* read both keys, skip if unchanged, POST /api/save (beacon on hide if small) */ };
    var orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      var out = orig.apply(this, arguments);
      if (this === window.localStorage && (k === KP || k === KG)) { clearTimeout(timer); timer = setTimeout(send, 2000); }
      return out;
    };
    document.addEventListener('visibilitychange', function () { if (document.hidden) send(true); });
  }
})();
```

---

## 2. Stack and layout

- **Hosting:** Vercel Hobby. Static files from `public/`. Functions in `api/`, one file per route, Web-standard handlers (`export async function GET(request) { return Response.json(...) }`). Node `22.x`. ES modules (`"type": "module"`).
- **Database:** Neon Free Postgres via `@neondatabase/serverless` (`neon(process.env.DATABASE_URL)`, HTTP queries). Region Singapore `aws-ap-southeast-1`. Vercel region `sin1` (same city; no India region exists on Neon).
- **AI:** Google Gemini REST `generateContent` with a free AI Studio key. Plus a built-in `mock` provider.
- **No frameworks.** No Express, no Next.js, no ORM. Plain `fetch`, `crypto`, `@neondatabase/serverless`.
- **Tests:** `node:test`. End-to-end: `playwright` (dev dependency).

```
square-one/
├─ public/                      # served as-is by Vercel
│  ├─ Square One.dc.html        # FROZEN
│  ├─ support.js                # FROZEN
│  ├─ sq-data.js                # FROZEN
│  ├─ sq-engine.js              # FROZEN
│  ├─ sq-game.js                # FROZEN
│  ├─ sq-bridge.js              # NEW: the only new browser code
│  ├─ favicon.ico               # NEW: any small pixel icon
│  └─ vendor/                   # NEW: react.production.min.js, react-dom.production.min.js, babel.min.js (committed)
├─ api/
│  ├─ page.js                   # GET  /  and /play (rewritten here)
│  ├─ health.js                 # GET  /api/health
│  ├─ ai/complete.js            # POST /api/ai/complete
│  ├─ save.js                   # POST /api/save
│  ├─ youtube/search.js         # GET  /api/youtube/search
│  ├─ youtube/videos.js         # GET  /api/youtube/videos
│  ├─ stats.js                  # GET  /api/stats
│  ├─ stats-page.js             # GET  /stats (rewritten here)
│  └─ junk.js                   # 204 for /{{...}} requests (rewritten here)
├─ lib/
│  ├─ config.js                 # reads env once, exports flags
│  ├─ http.js                   # json(), error(), readBody(limit), sameOrigin(), cookies, ipHash()
│  ├─ player.js                 # sq_pid cookie
│  ├─ db.js                     # Neon client or null; small query helpers
│  ├─ ratelimit.js              # Neon-backed, in-memory fallback
│  ├─ validate.js               # exact ports of vQ/vFort/vWarm/vRoom/vExtras
│  ├─ classify.js               # 4 prompt kinds
│  ├─ ai/index.js               # cache -> provider -> validate -> store -> log
│  ├─ ai/gemini.js              # REST client with model + setting fallbacks
│  ├─ ai/mock.js                # deterministic content that passes the validators
│  ├─ youtube.js                # proxy + cache
│  ├─ stats.js                  # SQL for numbers
│  ├─ page.js                   # builds the injected HTML
│  └─ generated/page-html.js    # GENERATED from the frozen HTML (committed)
├─ db/schema.sql
├─ scripts/
│  ├─ verify-frontend.mjs       # hash check (fails on mismatch)
│  ├─ embed-page.mjs            # writes lib/generated/page-html.js
│  ├─ copy-vendor.mjs           # copies vendor files from node_modules and checks their SRI against support.js
│  ├─ migrate.mjs               # runs db/schema.sql (idempotent)
│  └─ dev.mjs                   # local server that mimics Vercel (static + api + rewrites), loads .env.local
├─ tests/                       # node:test unit tests + e2e.spec.mjs
├─ design/                      # the zip's shots/, ref/, uploads/ (not deployed)
├─ frontend.lock.json
├─ vercel.json
├─ package.json
├─ .env.example
├─ README.md
└─ FINDINGS.md
```

`package.json` scripts: `dev` (`node scripts/dev.mjs`), `build` (`node scripts/verify-frontend.mjs && node scripts/embed-page.mjs`), `migrate`, `test` (`node --test tests/`), `e2e`, `verify:frontend`. Dependencies: `@neondatabase/serverless` (^1.2.0). Dev dependencies: `playwright` (^1.64), `react@18.3.1`, `react-dom@18.3.1`, `@babel/standalone@7.29.0` (exact; used only by `copy-vendor.mjs`).

`vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "public",
  "regions": ["sin1"],
  "functions": { "api/**/*.js": { "maxDuration": 90 } },
  "rewrites": [
    { "source": "/", "destination": "/api/page" },
    { "source": "/play", "destination": "/api/page" },
    { "source": "/stats", "destination": "/api/stats-page" },
    { "source": "/%7B%7B:path*", "destination": "/api/junk" }
  ],
  "headers": [
    { "source": "/vendor/(.*)", "headers": [{ "key": "cache-control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/(sq-data|sq-engine|sq-game|support|sq-bridge).js", "headers": [{ "key": "cache-control", "value": "public, max-age=600, stale-while-revalidate=86400" }] }
  ]
}
```
Verify each rewrite on a real preview deploy (static files win over rewrites on Vercel; `/` has no static file, so it reaches the function). If the junk-path rewrite pattern doesn't match on Vercel, fall back to returning 204 from `api/page.js` for that path or leave it as a harmless 404 and note it in FINDINGS.md.

---

## 3. Server behaviour

### 3.1 Config (`lib/config.js`)

| Env var | Meaning | Default |
| --- | --- | --- |
| `DATABASE_URL` | Neon pooled connection string | none → no DB (no cache, no sync, in-memory limits) |
| `GEMINI_API_KEY` | AI Studio key | none |
| `AI_MODE` | `live`, `live+mock`, `mock`, `off` | `live` if key present, else `off` |
| `GEMINI_MODEL` / `GEMINI_FAST_MODEL` | Force a model (tried first) | none |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | none → YouTube off |
| `IP_SALT` | random text for hashing IPs | if missing, use a per-instance random value and warn in `/api/health` |
| `ALLOWED_ORIGINS` | extra origins allowed to POST (comma list) | none |
| `STATS_PUBLIC` | show `/stats` | `true` |

Flags sent to the browser: `ai = AI_MODE !== 'off' && (AI_MODE includes 'mock' || has key)`, `sync = !!DATABASE_URL`, `youtube = !!YOUTUBE_API_KEY`.

### 3.2 Player id (`lib/player.js`)
Cookie `sq_pid`: 16 random bytes, base64url (22 chars). `Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`, plus `Secure` when `x-forwarded-proto` is `https`. Accept only `/^[A-Za-z0-9_-]{22}$/`, else issue a new one. Set it on the page response and on any API response where it was missing. Upsert `players(id, last_seen)` in the background (don't block the reply on it).

### 3.3 The page (`api/page.js`, `lib/page.js`)
- `scripts/embed-page.mjs` reads `public/Square One.dc.html` and writes `lib/generated/page-html.js` exporting `HTML` (string) and `HTML_SHA256`. Commit the generated file.
- On request: insert, immediately before `<script src="./support.js"></script>`:
  ```html
  <script>window.__SQ_SERVER={"ai":true,"sync":true,"youtube":true,"v":"BUILD_ID"};window.__resources={"https://unpkg.com/react@18.3.1/umd/react.production.min.js":"/vendor/react.production.min.js","https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js":"/vendor/react-dom.production.min.js","https://unpkg.com/@babel/standalone@7.29.0/babel.min.js":"/vendor/babel.min.js"};</script>
  <script src="/sq-bridge.js?v=BUILD_ID"></script>
  ```
  (flag values from config; `BUILD_ID` = `VERCEL_GIT_COMMIT_SHA` first 8 chars, or `dev`). Escape `<` in the JSON (`<`).
- If the marker is missing or the hash differs from the lock, **serve the original HTML unchanged** and log an error. Never fail the page.
- Headers: `content-type: text/html; charset=utf-8`, `cache-control: no-store`, `x-content-type-options: nosniff`, and the `sq_pid` cookie.

### 3.4 `POST /api/ai/complete`
Request `{ "prompt": string }` (JSON, max 64 KB body). Reply `200 { "text": string, "cached": bool, "kind": string, "model": string, "ms": number }`.

Steps:
1. Same-origin check: if an `Origin` header exists, its host must equal the request host or be in `ALLOWED_ORIGINS`; else `403 bad_origin`.
2. If `AI_MODE` is `off` → `503 ai_off`.
3. Classify (1.1). No match or > 12,000 chars → `400 bad_prompt`.
4. Rate limit: `ai:p:<pid>` 40 per 10 min and `ai:i:<iphash>` 120 per 10 min → `429 rate_limited` with `Retry-After`.
5. `hash = sha256(prompt)`. If DB: look up `ai_cache` where `prompt_hash = hash and (expires_at is null or expires_at > now())`. Hit → bump `hits` in the background, log the call, return `cached: true`.
6. Miss → provider:
   - `mock` mode: mock answer.
   - `live` / `live+mock`: Gemini (3.5). Parse JSON (take text from first `{` to last `}`; remove trailing commas before `}`/`]`). Validate with the kind's validator. Invalid → one more attempt (same model list), appending `\n\nYour previous reply was not valid JSON in the required shape. Reply again with ONLY the JSON object.` to the prompt (the cache key stays the original prompt).
   - `extras` quality bar: accept on first attempt only if at least 1 secret, 1 elite and 2 bosses are valid; otherwise retry once and then accept whatever passes `vExtras`.
   - Still failing: `live+mock` → mock answer (never cached). `live` → `502 ai_failed`.
7. Refusal (`{"ok":false}` from the model for fort/warm) → return `{"text":"{\"ok\":false}"}` with 200. The frontend turns this into its "That one can't become a fort" message. Cache refusals for 1 day.
8. Good live answer → `text = JSON.stringify(parsedObject)` (the model's object as parsed, not re-shaped). Insert into `ai_cache` with `expires_at = now() + 30 days`. Log to `ai_calls`. Return.
9. Optional: an in-memory map of in-flight prompt hashes so two identical requests on one instance share one Gemini call.

### 3.5 Gemini client (`lib/ai/gemini.js`)
- `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, header `x-goog-api-key`.
- Body: `{"contents":[{"role":"user","parts":[{"text": PROMPT}]}],"generationConfig":{"responseMimeType":"application/json","maxOutputTokens":8192,"thinkingConfig":{"thinkingLevel":"low"}}}`. Do not send `temperature`, `topP` or `topK` (deprecated on newer Flash models).
- Read text from `candidates[0].content.parts[]`, skipping parts with `thought: true`. `promptFeedback.blockReason` → treat as refusal for fort/warm, failure otherwise.
- Model lists (env override goes first, then the last model that worked on this instance):
  - main: `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`
  - fast: `gemini-3.5-flash-lite`, `gemini-3.8-flash`
- Fallback rules per attempt: HTTP 400 → retry same model without `thinkingConfig`, then without `responseMimeType`. 401 or "API key" in the message → stop (`bad_key`). 403/404/"not found"/"not supported" → next model. 429 → next model. 5xx or timeout → next model. Never exceed the kind's budget (1.1); each fetch gets an `AbortController` timeout of the remaining budget.
- Record which model answered (shown in `/api/health`).

### 3.6 Mock provider (`lib/ai/mock.js`)
Deterministic, skill-aware content that passes every validator. Used for `AI_MODE=mock`, as a fallback in `live+mock`, and in tests. Never cached. Must cover all 4 kinds and room numbers 1–20 (room 1 is a 2-minute task; room 20 is a project). Use plain, sensible generic learning steps (for example "Try {skill} for two minutes", "Spot the common beginner mistake", "Show your project to someone"), 4 distinct answers per question, `c` varied across 0–3, `fix` under 14 words. Unit-test every kind against the validators.

### 3.7 `POST /api/save`
- Accept `application/json` or `text/plain` (sendBeacon). Max 1,000,000 bytes, else `413`. Same-origin check. Rate limit `save:p:<pid>` 30 per minute.
- Body `{ "profile": string|null, "game": string|null }` (the raw localStorage strings). `game: null` means the player erased their save.
- Parse each. `game` is kept only if it passes the frontend's own load check: `g.fort && g.run && Array.isArray(g.fort.rooms) && g.fort.rooms.length === 20 && g.run.room >= 1 && g.run.room <= 20`.
- Upsert `saves` (profile, game, fort_id, skill, room, rooms_done = count of `run.status[i] === 'done'`, score, updated_at). Upsert `forts` (on conflict do nothing). Update `players.lang` and `players.streak_days` from the profile.
- No DB → `204` and do nothing. Reply `204` on success.

### 3.8 YouTube proxy (`/api/youtube/search`, `/api/youtube/videos`)
- If no `YOUTUBE_API_KEY` → `503`.
- Rate limit `yt:p:<pid>` 30 per 10 min, `yt:i:<iphash>` 90 per 10 min.
- search: allow only `part=snippet`, `type=video`, `maxResults` ≤ 8, `safeSearch`, `videoEmbeddable`, `q` ≤ 120 chars. videos: `part` (subset of `statistics,contentDetails,snippet`) and `id` = up to 8 ids matching `/^[\w-]{11}$/`. Drop every other parameter, including any `key`.
- Add the server key, fetch with a 9 s timeout, and return Google's JSON **unchanged** with Google's status code, so the frontend's own parsing works.
- Cache in `video_cache`: search by sha256 of the sorted allowed params for 7 days, videos for 1 day. Only cache 200 replies.

### 3.9 `GET /api/health`
`{ ok, version, db: "up"|"down"|"off", ai: { mode, lastModel }, youtube: bool, sync: bool, frontendLocked: bool, warnings: [] }`. Runs `select 1` when a DB is configured (this also wakes a sleeping Neon compute). Never expose keys.

### 3.10 `GET /api/stats` and `GET /stats`
- JSON: `players_total`, `players_today` (last_seen in 24 h), `forts_total` and `forts_today` (not sample), `rooms_done_total` (sum of saves.rooms_done), `ai_calls_today`, `cache_hit_pct_today`, `avg_live_ms_today`, `top_skills` (5, case-insensitive, not sample). Cache the result in memory for 10 s.
- `/stats`: one self-contained server-rendered HTML page in the game's style (background `#07061a`, text `#f5ecd9`, accent `#ffb22e`, Press Start 2P for numbers). Big numbers, one line each, auto-refresh every 10 s, readable on a phone. No scripts from other sites except Google Fonts. Hidden (404) if `STATS_PUBLIC=false`.

### 3.11 Rate limits (`lib/ratelimit.js`)
```sql
insert into rate_hits (bucket, window_start, count) values ($1, $2, 1)
on conflict (bucket, window_start) do update set count = rate_hits.count + 1
returning count;
```
`window_start` = start of the current window. Over the limit → 429. About 1 in 50 calls also deletes rows older than 1 day. No DB → an in-memory `Map` with the same rules.

---

## 4. The bridge (`public/sq-bridge.js`)

Plain ES5-style browser script, no imports, under 4 KB minified. It runs before `support.js`. Start from 1.3 and add:

1. **AI:** as in 1.3. Only when `cfg.ai`.
2. **Save backup** (only when `cfg.sync`):
   - Wrap `Storage.prototype.setItem` and `Storage.prototype.removeItem`; react only when `this === window.localStorage` and the key is one of the 2 save keys. Always call the original first and return its result; never throw from the wrapper.
   - Debounce 2 s. Read both keys from localStorage; if a read gives null **and** `window.__sq && window.__sq.store && window.__sq.store.mem` holds the key, use that value (private-mode fallback).
   - Skip sending when the body equals the last sent body.
   - On `visibilitychange` to hidden: send now with `navigator.sendBeacon` if the body is under 60,000 bytes, otherwise a normal `fetch` (no `keepalive`).
   - A removed game key sends `game: null`.
3. **YouTube** (only when `cfg.youtube`):
   - Before the game boots, read `squareone.v1.profile`; if `settings.ytKey` is empty or missing, set it to `server` and write the profile back. If `cfg.youtube` is false and the key is exactly `server`, set it back to `''`.
   - Wrap `window.fetch`: when the URL (string or `Request`) starts with `https://www.googleapis.com/youtube/v3/search?` or `.../videos?` **and** its `key` param is `server`, call `/api/youtube/search` or `/api/youtube/videos` with the same params minus `key`. Everything else passes through untouched.
4. Every part is wrapped in `try/catch`; any failure leaves the game exactly as it would behave without the bridge.

---

## 5. Database (`db/schema.sql`, idempotent)

```sql
create table if not exists players (
  id text primary key,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  lang text,
  streak_days int not null default 0
);
create table if not exists saves (
  player_id text primary key references players(id) on delete cascade,
  profile jsonb,
  game jsonb,
  fort_id text,
  skill text,
  room int,
  rooms_done int,
  score int,
  updated_at timestamptz not null default now()
);
create table if not exists forts (
  id text primary key,
  skill text not null,
  lang text,
  fort_name text,
  sample boolean not null default false,
  first_player text references players(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists ai_cache (
  prompt_hash text primary key,
  kind text not null,
  skill text,
  response text not null,
  refusal boolean not null default false,
  model text,
  hits int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create table if not exists ai_calls (
  id bigint generated always as identity primary key,
  player_id text,
  kind text not null,
  cached boolean not null,
  ok boolean not null,
  model text,
  ms int,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists ai_calls_created_idx on ai_calls (created_at desc);
create table if not exists video_cache (
  cache_key text primary key,
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table if not exists rate_hits (
  bucket text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (bucket, window_start)
);
create index if not exists forts_skill_idx on forts (lower(skill));
create index if not exists players_seen_idx on players (last_seen desc);
```
Make sure a `players` row exists before inserting into `saves` (upsert it in the same request). Trim `ai_calls` older than 30 days and expired cache rows opportunistically (about 1 in 100 requests).

---

## 6. Work order

Do the phases in order. After each: run `npm run verify:frontend` and `npm test`, then write 3–5 lines in `PROGRESS.md` (what was done, what was checked).

1. **Skeleton + mock backend (no accounts needed).** Repo layout, frozen files copied in, lock + verify script, vendor copy with SRI check, page injection, bridge (AI + sync parts), `api/ai/complete` in `mock` mode, `api/save` (no-DB path), `api/health`, junk 204, favicon, `scripts/dev.mjs`. The whole game must play locally with `AI_MODE=mock`.
2. **Neon.** Schema, migrate script, `players`/`saves`/`forts`, rate limits, `ai_calls` log. Use a Neon branch for tests.
3. **Gemini.** Live provider, validators, cache, refusals, `live+mock` fallback.
4. **YouTube.** Proxy, cache, bridge sentinel + fetch rewrite.
5. **Stats.** `/api/stats` and `/stats`.
6. **Hunt and fix.** Run the full game end to end (section 7). Fix every backend or bridge problem you find. Put every frontend problem in `FINDINGS.md`. Do not add features.
7. **Finish.** README (plain-language setup and deploy steps), `.env.example`, final `PROGRESS.md` summary.

---

## 7. Tests and "done means"

Unit tests (`node:test`):
- Validators: load `public/sq-data.js` in a `vm` context with a `window` object, then check that every `SQ.SAMPLE.rooms[i].content` passes `vRoom`, `SQ.SAMPLE.warm` passes `vWarm`'s question rules, and broken variants (3 answers, duplicate answers, `c: 4`, missing title) fail.
- Classifier: build prompts with copies of the frontend's `AIP` templates (copy them into `tests/fixtures/prompts.mjs`) for 3 skills × 3 languages; each must classify correctly. Random text, an empty string and a 13,000-character prompt must be refused.
- Mock: every kind, every room 1–20, passes the validators.
- Page: injected HTML has the bridge lines directly before `support.js`; a missing marker returns the original HTML; the frozen hash is unchanged.
- Rate limiter (in-memory path), save parsing (good game, broken game, `null` game), YouTube param filtering.

End-to-end (`npm run e2e`, Playwright, against `scripts/dev.mjs` with `AI_MODE=mock`; block `unpkg.com` and `fonts.googleapis.com` in the test browser):
1. Open `/`; wait for `window.__sq.bootInfo.ready`; press Enter; screen is `title`; `window.__sq.snapshot().title.aiOk === true`.
2. `window.__sq.startSkill('Excel')`; answer the warm-up dummies by firing the right weapon (`f.order.indexOf(f.q.c)`); screen becomes `play` on room 6.
3. `openTerminal()` → terminal ready with steps; `closeTerminal()` → fight opens; fire the right answer → phase moves past the fight.
4. Within 5 s a `POST /api/save` arrives; with a DB, a `saves` row exists for the cookie's player.
5. No request ever goes to `unpkg.com`. No page errors.
6. Repeat with `playSample()` and with AI off (`AI_MODE=off`): the title shows the "AI not reachable" note and the sample still plays.

Done means all of these are true:
- [ ] `npm run verify:frontend` passes; `git diff` shows no change to the 5 frozen files.
- [ ] `npm test` and `npm run e2e` pass.
- [ ] On a Vercel preview with real keys: `/` shows the game; "Excel" builds a real fort; building "Excel" again in a fresh browser is served from the cache (`ai_calls.cached = true`) and is noticeably faster; a terminal shows a real video picked by the server; `/stats` shows live numbers; `/api/health` is all green.
- [ ] Erasing the save in the game's Settings sets `saves.game` to null.
- [ ] `FINDINGS.md` lists every frontend issue found, with file and line, none of them fixed in the frontend.
- [ ] README explains setup in plain words: Neon project (Singapore), Vercel project (region sin1), env vars, `npm run migrate`, deploy, and the demo-day checklist (open `/api/health` a minute before, keep a second Gemini key).

---

## 8. FINDINGS.md starter (verify each, then add your own)

| Issue | Where | Backend workaround |
| --- | --- | --- |
| AI only exists inside Claude (`window.claude`) | `sq-game.js` `aiOk()` | Bridge provides it |
| React loads from unpkg on every visit | `support.js` `cdn.ts` section | `window.__resources` → `/vendor` |
| YouTube key typed into the browser and visible | `sq-game.js` `findVideo()` | Server key behind the `server` placeholder |
| No favicon → one 404 per visit | page head | `public/favicon.ico` |
| Raw template makes the browser request `/{{ term.video.embed }}` | `Square One.dc.html` iframe `src` | 204 reply |
| `sq-data.js`, `sq-engine.js`, `sq-game.js` and the font CSS load twice per visit | runtime helmet re-mount | cache headers |
| Storage blocked (some private modes) → saves only in memory | `sq-game.js` `Store` | Bridge reads `__sq.store.mem` |
| Boot waits up to 3.5 s if Google Fonts is blocked | `sq-game.js` boot step 2 | none (report only) |
| Right arrow turns right; no letter key turns right (Q turns left, E is "use") | `sq-game.js` line 763 | none (report only) |
| Sample fort takes the player's language but its text is English; the `ofl` note is never shown | `sq-game.js` lines 7–9, 231–235 | none (report only) |
