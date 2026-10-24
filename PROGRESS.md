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
