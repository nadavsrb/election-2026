# הפתק שלי: בחירות 2026

כלי עזר ניטרלי לבחירות לכנסת ה-26 (יום שלישי, 27 באוקטובר 2026): שאלון התאמה, פרופיל אחיד לכל רשימה עם מקורות, הסבר על הנושאים שעל הפרק ומדריך הצבעה.

**האתר:** https://nadavsrb.github.io/election-2026/

## עקרונות
- פרויקט אזרחי עצמאי. לא קשור לאף מפלגה ולא ממליץ למי להצביע.
- לכל עמדה יש מקור, תאריך ורמת ודאות.
- אין סקרים, אין מעקב, אין עוגיות. השאלון רץ כולו בדפדפן.
- כל הנתונים פתוחים ב-[`src/data`](src/data). מצאתם טעות? [פתחו issue](https://github.com/nadavsrb/election-2026/issues/new).

## Data
| File | Contents |
|---|---|
| `src/data/statements.json` | Quiz statements, topic, quick/full set, axis direction |
| `src/data/topics.json` | Topics with neutral background and arguments for and against |
| `src/data/parties.json` | Profiles of the main lists |
| `src/data/lists.json` | All lists on the ballot, with ballot letters |
| `src/data/positions.json` | One entry per party × statement: stance (-2…2 or null), confidence, basis, sources |

`npm run validate` cross-checks every reference and requires a source for every stance.

## Development
```bash
npm install
npm run dev        # http://localhost:4321/election-2026/
npm run validate   # data checks
npm run build      # static site in dist/
```
Pushing to `master` deploys to GitHub Pages through `.github/workflows/deploy.yml`.

Stack: Astro 5, Preact (quiz and compare islands), Tailwind CSS 4, self-hosted fonts (Frank Ruhl Libre, IBM Plex Sans Hebrew).
Design notes are in [DESIGN.md](DESIGN.md).
