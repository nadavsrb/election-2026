# הפתק שלי — project notes

A neutral, static voting-advice site for Israel's 26th Knesset election (Tue 27 Oct 2026), deployed to GitHub Pages from `master`.

## Commands
- `npm run dev` / `npm run build` / `npm run preview` (served under `/election-2026/`)
- `npm run validate` — cross-checks `src/data/*.json`; CI runs it before every build
- `node scripts/shot.mjs [--dark] [--desktop] [--full] <paths…>` — phone/desktop screenshots of the preview server
- `node scripts/a11y.mjs` — axe-core WCAG 2.1 AA checks, light and dark (must stay at zero violations)
- `node scripts/make-og.mjs` — regenerates `public/og.png`

## Data model (`src/data`)
- `statements.json` — quiz statements. `axis` maps a statement to a map axis (`dip`, `rel`, `gov`); `+1` means agreeing moves toward the axis' "high" end. `context` is a one-to-two-sentence plain explanation.
- `positions.json` — one entry per party × statement: `stance` −2…2 or `null` (unknown), `confidence` (`high` explicit / `medium` consistent statements / `low` inferred), Hebrew `basis`, and `sources`.
- `parties.json` (13 main lists), `lists.json` (every list on the ballot), `topics.json` (neutral background with arguments for and against).
- Every stance needs at least one real source URL. The validator rejects placeholder domains.

## Neutrality rules (non-negotiable)
- Every list gets the same template and size. Directories sort alphabetically; tied results and the home tray are random. No party logos or party colors.
- About half of the statements should be phrased so that agreeing is the right/religious/government-strengthening position, and half the opposite. Today it is 12 of 26. Keep it balanced when editing.
- Give contested terms both names ("יהודה ושומרון / הגדה המערבית"). No polls: they are banned by law from 23 Oct 23:59 until the polls close, and polls are out of scope anyway.
- Never guess a party's position. Unknown stays `null` and shows as "אין עמדה ידועה".
- Hebrew copy is gender-inclusive plural (אתם, בחרו). Write time ranges with words ("מ-07:00 עד 22:00"), because an en dash between numbers renders reversed in RTL.

## Code map
- `src/lib/scoring.ts` — pure scoring, axis and share-code logic shared by the islands.
- `src/lib/data.ts` — zod-validated build-time data plus the `quizPayload()` served at `/data/quiz.json`.
- `src/components/quiz/*` — Preact quiz, results and map. `src/components/compare/*` — the compare island.
- Design tokens and rationale: `DESIGN.md`. Vendored Anthropic skills: `.claude/skills/frontend-design`, `.claude/skills/webapp-testing`.
