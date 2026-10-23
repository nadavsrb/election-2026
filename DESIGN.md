# DESIGN.md — הפתק שלי

## Brief
- **Subject:** a non-partisan voting-advice site for Israel's 26th Knesset election (27 Oct 2026).
- **Audience:** Israeli voters, many unfamiliar with the parties; mostly on phones, often arriving from WhatsApp links.
- **Primary job:** show where each list stands, with sources, and which lists are closest to the visitor's views, without steering them.

## Concept: the ballot slip (פתק)
The one memorable element is the Israeli paper ballot slip: white paper, heavy black letters (the list's ballot letters), the list name below.
Every list is represented by the same slip, in the same size, in random order. No logos and no party colors.

## Tokens
| Token | Light | Dark | Use |
|---|---|---|---|
| canvas | `#f2f0f7` | `#14111f` | page background |
| surface | `#ffffff` | `#1d1930` | panels |
| ink | `#1a1625` | `#ece8f6` | text |
| ink-soft | `#4d4760` | `#b3abc9` | secondary text |
| accent | `#5536c4` | `#6a4be0` | actions, focus |
| booth | `#221a47` | `#0d0a1a` | hero and footer |
| slip | `#ffffff` | `#f6f4ee` | ballot slips (always paper, always black ink) |

Violet was chosen to stay clear of the main lists' brand colors (checked against the research in `src/data/parties.json`). Avoid party blues, Hadash/Labor red, Ra'am/Meretz green, and the orange or yellow of protest campaigns.

## Type
- **Frank Ruhl Libre** 700/900: slip letters, headings.
- **IBM Plex Sans Hebrew** 400–700: body and UI.
- Body at 17px with 1.65 line height. Reading width is capped at about 66 characters.

## Principles
1. The slip is the identity. Everything else stays quiet.
2. Equal treatment is visible: same template and size for every list, random order, and a note saying the order is random.
3. Show the source of every claim, and be honest about confidence.
4. Plain, calm Hebrew. Use gender-inclusive plural forms (בחרו, אתם). Avoid loaded terms, or give both names.
5. Motion happens in one place only, when the results are revealed. `prefers-reduced-motion` is respected.
6. Write time ranges with words ("מ-07:00 עד 22:00"). An en dash between numbers reverses visually in RTL text.

## Avoid
Party colors, party logos, polls, "recommended" badges, "#1" medals, all-caps eyebrows, middle-dot meta strings, and identical SaaS cards.
