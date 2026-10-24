# Square One backend progress

Implementation root: `backend-arch-ref/` (the supplied specification and locked `public/` files are here). The workspace has no `.git` directory; SHA-256 checks provide the available baseline. No frozen file has been written.

## Phase 1 — skeleton and mock

- Added the plain Node/Web-handler server, injection, local vendor copies, bridge, deterministic mock content and exact frontend validators.
- Vendor bytes match all three SRI values in frozen `support.js`; all five frontend fingerprints pass.
- Specification correction: `node --test tests/` fails with `MODULE_NOT_FOUND` on the supplied Node 22.16.0. Use `node --test tests/*.test.js`, which also excludes the standalone browser runner.
- Live service credentials are absent. Account-dependent checks will be recorded separately from local checks.
- Confirmed frozen sample room 1 has case-fold duplicate answers (`print`/`Print`), rejected by its own validator. Recorded in FINDINGS; regression test documents the exception instead of changing validation or frozen content.
- Local Chrome/Playwright smoke run: boot → Enter → Excel → three correct warm-up shots → play in room 6; no page errors. Unit suite and frontend verification pass after the documented corrections.

