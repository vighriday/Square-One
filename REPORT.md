# Square One handoff

Repository: https://github.com/vighriday/Square-One ? main. Each completed phase was pushed separately, with no coauthor trailers. The user-supplied readme-pack README and media were copied byte-for-byte.

## Done checklist (AGENTS section 7)

- [x] All five frontend hashes pass; Git diff from frozen baseline 7f92597 is empty for those files.
- [x] npm test passes (30 tests); full Chrome game playthroughs pass. Final expanded browser verification includes actual Settings erasure and fully blocked storage.
- [ ] Real-key Vercel preview acceptance: pending a connected Vercel account, Neon test branch and real Gemini/YouTube keys. No live deployment URL, real cache-speed comparison or real video is claimed.
- [x] Erase sends game:null from the browser; the transaction test checks SQL NULL. A real saves row on Neon still needs the branch test.
- [x] FINDINGS.md records every discovered frozen frontend issue with file, line and suggestion; none was fixed in the frontend.
- [x] README: installed the user-supplied README and media without editing. Exact operational instructions and remaining live checks are also in DEPLOYMENT.md. The supplied YOUR-APP / YOUR-ORG placeholders remain for the author.

## Files added

- [README.md](README.md) ? User-supplied README, unchanged.
- [docs/media/gameplay.gif](docs/media/gameplay.gif) ? User-supplied README media, unchanged.
- [docs/media/hero.png](docs/media/hero.png) ? User-supplied README media, unchanged.
- [docs/media/icons/boss.png](docs/media/icons/boss.png) ? User-supplied README media, unchanged.
- [docs/media/icons/dummy.png](docs/media/icons/dummy.png) ? User-supplied README media, unchanged.
- [docs/media/icons/elite.png](docs/media/icons/elite.png) ? User-supplied README media, unchanged.
- [docs/media/icons/key.png](docs/media/icons/key.png) ? User-supplied README media, unchanged.
- [docs/media/icons/monster.png](docs/media/icons/monster.png) ? User-supplied README media, unchanged.
- [docs/media/icons/portal.png](docs/media/icons/portal.png) ? User-supplied README media, unchanged.
- [docs/media/monsters.png](docs/media/monsters.png) ? User-supplied README media, unchanged.
- [docs/media/screens/elite.jpg](docs/media/screens/elite.jpg) ? User-supplied README media, unchanged.
- [docs/media/screens/fight-wrong.jpg](docs/media/screens/fight-wrong.jpg) ? User-supplied README media, unchanged.
- [docs/media/screens/fight.jpg](docs/media/screens/fight.jpg) ? User-supplied README media, unchanged.
- [docs/media/screens/map.jpg](docs/media/screens/map.jpg) ? User-supplied README media, unchanged.
- [docs/media/screens/phones.jpg](docs/media/screens/phones.jpg) ? User-supplied README media, unchanged.
- [docs/media/screens/portal.jpg](docs/media/screens/portal.jpg) ? User-supplied README media, unchanged.
- [docs/media/screens/room1.jpg](docs/media/screens/room1.jpg) ? User-supplied README media, unchanged.
- [docs/media/screens/stats.jpg](docs/media/screens/stats.jpg) ? User-supplied README media, unchanged.
- [docs/media/screens/terminal.jpg](docs/media/screens/terminal.jpg) ? User-supplied README media, unchanged.
- [docs/media/screens/title-hindi.jpg](docs/media/screens/title-hindi.jpg) ? User-supplied README media, unchanged.
- [docs/media/screens/title.jpg](docs/media/screens/title.jpg) ? User-supplied README media, unchanged.
- [docs/media/screens/warmup.jpg](docs/media/screens/warmup.jpg) ? User-supplied README media, unchanged.
- [REPORT.md](REPORT.md) — Final checklist, file inventory, fixes, findings, deployment steps and remaining checks.
- [.editorconfig](.editorconfig) ? Editor exclusions for frozen files.
- [.env.example](.env.example) ? Safe demo/live environment template.
- [.prettierignore](.prettierignore) ? Formatter exclusions.
- [.vercelignore](.vercelignore) ? Keep design references and tests out of deployment.
- [DEPLOYMENT.md](DEPLOYMENT.md) ? Vercel diagram, exact setup, live acceptance and demo-day checklist.
- [FINDINGS.md](FINDINGS.md) ? Eleven frozen frontend findings; no frontend fixes.
- [PROGRESS.md](PROGRESS.md) ? Phase-by-phase verification and specification corrections.
- [api/ai/complete.js](api/ai/complete.js) ? AI POST endpoint.
- [api/health.js](api/health.js) ? Operational flags and database probe.
- [api/junk.js](api/junk.js) ? Raw-template 204 response.
- [api/page.js](api/page.js) ? Game page handler.
- [api/save.js](api/save.js) ? Save/erase endpoint.
- [api/stats-page.js](api/stats-page.js) ? Statistics HTML.
- [api/stats.js](api/stats.js) ? Statistics JSON.
- [api/youtube/search.js](api/youtube/search.js) ? Video search route.
- [api/youtube/videos.js](api/youtube/videos.js) ? Video metadata route.
- [db/schema.sql](db/schema.sql) ? Exact idempotent Neon tables and indexes.
- [lib/ai/gemini.js](lib/ai/gemini.js) ? Gemini REST and model/setting fallbacks.
- [lib/ai/index.js](lib/ai/index.js) ? Validated cache/provider/retry flow.
- [lib/ai/mock.js](lib/ai/mock.js) ? Deterministic practice content for every kind/room.
- [lib/classify.js](lib/classify.js) ? Four frontend prompt patterns.
- [lib/config.js](lib/config.js) ? Environment flags.
- [lib/db.js](lib/db.js) ? Neon HTTP queries, logs and maintenance.
- [lib/generated/page-html.js](lib/generated/page-html.js) ? Generated, committed frozen HTML string.
- [lib/http.js](lib/http.js) ? Origin, bounded body, response and hashing helpers.
- [lib/page.js](lib/page.js) ? Verified serve-time injection.
- [lib/player.js](lib/player.js) ? Anonymous cookie and background tracking.
- [lib/ratelimit.js](lib/ratelimit.js) ? Database/memory fixed-window counters.
- [lib/save.js](lib/save.js) ? Frontend-compatible parsing and ordered save transaction.
- [lib/stats.js](lib/stats.js) ? Aggregate queries, ten-second cache and escaped HTML.
- [lib/validate.js](lib/validate.js) ? Exact frozen validators with refusal signals.
- [lib/youtube.js](lib/youtube.js) ? Allowlisted proxy, deadline and cache.
- [package-lock.json](package-lock.json) ? Reproducible dependency lock.
- [package.json](package.json) ? Allowed dependencies and scripts.
- [public/favicon.ico](public/favicon.ico) ? Small pixel favicon.
- [public/sq-bridge.js](public/sq-bridge.js) ? AI adapter, save backup and YouTube sentinel rewrite.
- [public/vendor/babel.min.js](public/vendor/babel.min.js) ? Committed Babel 7.29.0.
- [public/vendor/react-dom.production.min.js](public/vendor/react-dom.production.min.js) ? Committed ReactDOM 18.3.1.
- [public/vendor/react.production.min.js](public/vendor/react.production.min.js) ? Committed React 18.3.1.
- [scripts/copy-vendor.mjs](scripts/copy-vendor.mjs) ? Copy only SRI-matched vendor bytes.
- [scripts/dev.mjs](scripts/dev.mjs) ? Local static/functions/rewrites server.
- [scripts/embed-page.mjs](scripts/embed-page.mjs) ? Generate the page module.
- [scripts/migrate.mjs](scripts/migrate.mjs) ? Run the schema transaction.
- [scripts/verify-frontend.mjs](scripts/verify-frontend.mjs) ? Five SHA-256 checks.
- [tests/ai.test.js](tests/ai.test.js) ? Contract/regression/browser verification.
- [tests/api.test.js](tests/api.test.js) ? Contract/regression/browser verification.
- [tests/bridge.test.js](tests/bridge.test.js) ? Contract/regression/browser verification.
- [tests/core.test.js](tests/core.test.js) ? Contract/regression/browser verification.
- [tests/e2e.spec.mjs](tests/e2e.spec.mjs) ? Contract/regression/browser verification.
- [tests/fixtures/prompts.mjs](tests/fixtures/prompts.mjs) ? Contract/regression/browser verification.
- [tests/stats.test.js](tests/stats.test.js) ? Contract/regression/browser verification.
- [tests/storage.test.js](tests/storage.test.js) ? Contract/regression/browser verification.
- [tests/youtube.test.js](tests/youtube.test.js) ? Contract/regression/browser verification.
- [vercel.json](vercel.json) ? sin1 functions, rewrites, cache headers and build configuration.

Existing .gitignore was extended for the workspace npm cache. Existing AGENTS.md, frontend.lock.json, design references and frozen files were preserved.

## Backend and bridge problems fixed

- Save changes made during an in-flight request were dropped; the bridge now sends the latest body after completion.
- Removed game storage could fall back to stale Store.mem; explicit removal now sends null, while subsequent memory-only games can still back up.
- When storage is completely blocked, frozen Store skips Storage.setItem; a two-second read-only check backs up memory saves without mutating the game.
- The specified node --test tests/ command fails on the supplied Node 22; an explicit tests/*.test.js glob runs only unit tests.

## Frozen frontend findings (not fixed)

See FINDINGS.md for all eleven entries: Claude-only AI hook, unpkg defaults, browser YouTube keys, favicon, raw template iframe, repeated head assets, storage-only memory fallback, font boot wait, asymmetric turn keys, untranslated sample/no notice, and room-1 case-insensitive duplicate answers. The exact validator rejects sample room 1; rooms 2?20 and all warm questions pass. The bundled sample still plays because its preloaded content bypasses validation.

## Exact deployment steps

For the fastest proper mock demo: Vercel Hobby ? import vighriday/Square-One ? framework Other ? Node 22.x ? install npm ci ? build npm run build ? output public ? set AI_MODE=mock for Preview/Production ? Deploy. vercel.json specifies sin1. No DB or API accounts are needed for this mode.

For live services: create Neon Free in aws-ap-southeast-1; create a separate test branch; copy its pooled URL to ignored .env.local; run npm run migrate against that branch and later against production. Set Vercel DATABASE_URL, GEMINI_API_KEY, YOUTUBE_API_KEY, AI_MODE=live and a random stable IP_SALT. STATS_PUBLIC=true is optional/default. Preview should use the Neon test branch. Redeploy after environment changes.

Run the preview checks and SQL in DEPLOYMENT.md. On demo day, warm /api/health a minute before presenting, test Excel and a repeat cache hit, check a real video and stats, keep a second free Gemini key privately ready, and retain the Python sample/mock fallback.

## Remaining uncertainty

Live Neon migration/queries, Gemini availability/latency, YouTube quota/video selection and Vercel routing (especially the encoded junk rewrite) need actual service access. Health lastModel is instance-local and may be null on a separate serverless health instance. No-DB sync is deliberately disabled; save tests turn on only the injected sync flag in their browser harness to exercise the real no-DB endpoint.
