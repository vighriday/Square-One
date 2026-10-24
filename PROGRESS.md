# Square One backend progress

Implementation root: `backend-arch-ref/` (the supplied specification and locked `public/` files are here). The workspace has no `.git` directory; SHA-256 checks provide the available baseline. No frozen file has been written.

## Phase 1 — skeleton and mock

- Added the plain Node/Web-handler server, injection, local vendor copies, bridge, deterministic mock content and exact frontend validators.
- Vendor bytes match all three SRI values in frozen `support.js`; all five frontend fingerprints pass.
- Specification correction: `node --test tests/` fails with `MODULE_NOT_FOUND` on the supplied Node 22.16.0. Use `node --test tests/*.test.js`, which also excludes the standalone browser runner.
- Live service credentials are absent. Account-dependent checks will be recorded separately from local checks.
- Confirmed frozen sample room 1 has case-fold duplicate answers (`print`/`Print`), rejected by its own validator. Recorded in FINDINGS; regression test documents the exception instead of changing validation or frozen content.
- Local Chrome/Playwright smoke run: boot → Enter → Excel → three correct warm-up shots → play in room 6; no page errors. Unit suite and frontend verification pass after the documented corrections.

## Phase 2 — Neon persistence

- Added the exact idempotent schema, migration runner, ordered player/fort/save transaction, explicit SQL NULL erase, AI logging and opportunistic cleanup.
- Added database-backed fixed-window limits with memory fallback; player touches use Vercel's request context `waitUntil` when available, without adding a dependency.
- `npm run verify:frontend` and all 9 unit tests pass. Transaction order, erase parsing and window boundaries checked locally.
- No DATABASE_URL or connected Neon account is available; migration and real-branch integration remain unverified, not simulated as a successful live test.

## Phase 3 — Gemini

- Added REST model/setting fallbacks, a shared request deadline across retries, JSON extraction/repair, exact validation, extras quality retry and canonical refusals.
- Valid live responses and refusals use 30-day / 1-day Neon cache lifetimes. Mock and live+mock fallback content never enter the cache. Duplicate in-flight prompts share work.
- All 16 unit tests and frontend verification pass, including cache corruption, bad-key early stop, thought filtering, settings fallback and retry behavior.
- Official Google model/thinking documentation confirms the specified model names and low thinking setting; real free-key availability and live latency remain deployment checks.

## Phase 4 — YouTube

- Added allowlisted search/video proxies, nine-second upstream timeout, rate limits and seven-day / one-day Neon cache lifetimes.
- The bridge sets/clears the `server` placeholder and redirects only matching placeholder-key requests; user-supplied keys and unrelated fetches pass through.
- `npm run verify:frontend` and all 19 tests pass. Verified parameter stripping, ID/query bounds, upstream JSON/status preservation and cache-on-200 only.
- A real YouTube video and quota behavior require a server key, which is not present here.

## Phase 5 — stats

- Added aggregate SQL, numeric JSON output and a self-contained responsive stats page with a ten-second refresh; both routes respect STATS_PUBLIC=false.
- Sample forts are excluded from fort/skill counts, skills are case-insensitive, live latency excludes mock/cache replies, and HTML output is escaped.
- `npm run verify:frontend` and all 20 unit tests pass; cache expiry and no-database zero counts are checked.
- User authorized incremental GitHub commits/pushes without coauthors. The specified remote was empty; preserving the supplied frozen baseline before backend commits.

## Phase 6 — hunt and fix

- Chrome/Playwright completed mock Excel from warm-up through room 20/victory and offline Python through all rooms 1–20/victory. No page errors or unpkg requests; Google Fonts blocked. Desktop terminal and mobile title screenshots visually reviewed.
- Fixed save changes lost during an in-flight request, stale memory resurrecting deleted saves, and missing backup events when storage is entirely blocked. Read-only memory polling is necessary because frozen Store.set returns before Storage.setItem when Store.ok=false. Bridge is 3,028 bytes minified; regression tests cover these cases.
- Specification correction: with no DATABASE_URL, sync=false intentionally prevents save POSTs. Browser save tests enable only the injected sync flag in a test harness and exercise the real no-DB save endpoint; they do not claim a real Neon row. Save arrival within five seconds and erase `game:null` verified.
- All 30 unit tests and frozen hashes pass. The sample validator exception and all ten starter findings are documented in FINDINGS. Cached Chrome measured font CSS twice and game scripts once over the network; cache headers remain as specified.

## Phase 7 — handoff

- Added .env.example and DEPLOYMENT.md with the Vercel schema, account-free mock launch, Neon/Gemini/YouTube setup, preview checks and demo-day checklist.
- User explicitly took ownership of README; no README was created. DEPLOYMENT.md holds the operational handoff.
- Frozen baseline and phases 1–5 were individually committed and pushed to main without coauthor trailers. Hunt fixes and deployment handoff follow as separate commits.
- Vercel CLI/login/env credentials are absent. A Vercel integration was found but is not connected; it was offered for connection. No live deployment or account-dependent acceptance test is claimed.
