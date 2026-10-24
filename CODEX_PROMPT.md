You are finishing the backend for **Square One**, a browser game whose frontend is complete and frozen.

The repository already contains:
- `public/` — the 5 frozen game files (`Square One.dc.html`, `support.js`, `sq-data.js`, `sq-engine.js`, `sq-game.js`)
- `design/` — screenshots and references (not deployed)
- `AGENTS.md` — the full specification. It is the source of truth.
- `frontend.lock.json` — SHA-256 fingerprints of the 5 frozen files

## Your job

1. Read `AGENTS.md` completely before writing anything.
2. Build the backend phase by phase, in the order of `AGENTS.md` section 6. Phase 1 is a fully working **mock backend** that needs no accounts (`AI_MODE=mock`, no database). Then Neon, Gemini, YouTube, stats.
3. After every phase run `npm run verify:frontend` and `npm test`, and add a short entry to `PROGRESS.md`.
4. Phase 6 is a bug hunt. Play the whole game end to end in a real browser with Playwright, exactly as `AGENTS.md` section 7 describes. Fix every problem you find in the backend or the bridge. Write every problem you find in the frozen frontend into `FINDINGS.md` (file, line, what happens, suggested fix). Do not fix those.
5. Finish with the README, `.env.example`, and the final report below.

## Rules you must not break

- Do **not** modify, reformat, rename, move or re-save the 5 frozen files. `npm run verify:frontend` must pass at every step and `git diff` must show no change to them.
- All browser-side additions go in `public/sq-bridge.js`, which the server inserts into the page at serve time.
- Do not change anything else that already works. Do not add features, screens, frameworks, TypeScript, ORMs or dependencies beyond what `AGENTS.md` lists.
- Free services only: Vercel Hobby, Neon Free Postgres (region `aws-ap-southeast-1`, Vercel region `sin1`), a free Gemini API key, the free YouTube quota. No Supabase. No Redis.
- The game must still work with zero environment variables (offline Python fort).
- Never put secrets in the browser, in logs, or in git.
- If something in `AGENTS.md` turns out to be impossible or wrong when you test it, choose the smallest fix that keeps every rule above, and write what you changed and why in `PROGRESS.md`. Do not silently invent around it.

## Final reply

1. **Done checklist:** every item of `AGENTS.md` section 7 "Done means", ticked, or explained if not.
2. **Files added**, one line each.
3. **Backend or bridge problems found and fixed.**
4. **Frontend problems found** (from `FINDINGS.md`), not fixed.
5. **Exact deploy steps for me:** create the Neon project, create the Vercel project, the environment variables to set, `npm run migrate`, deploy, and the demo-day checklist.
6. **Anything you were unsure about.**
