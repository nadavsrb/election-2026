export const SITE_NAME = 'הפתק שלי';
export const SITE_TAGLINE = 'כלי עזר ניטרלי לבחירות לכנסת ה-26';
export const SITE_DESCRIPTION =
  'שאלון קצר שמראה אילו רשימות קרובות לעמדות שלכם, פרופיל אחיד לכל מפלגה עם מקורות, הסבר על הנושאים שעל הפרק ומדריך הצבעה. בלי הרשמה, בלי מעקב, בלי המלצות.';

export const REPO_URL = 'https://github.com/nadavsrb/election-2026';
export const ISSUES_URL = `${REPO_URL}/issues/new`;

// Israel leaves daylight saving time on Sunday 25 Oct 2026, so election day is UTC+2.
export const POLLS_OPEN_ISO = '2026-10-27T07:00:00+02:00';
export const POLLS_CLOSE_ISO = '2026-10-27T22:00:00+02:00';
export const ELECTION_DATE_LABEL = 'יום שלישי, 27 באוקטובר 2026';

/** Join a site-relative path onto the deployment base (GitHub Pages serves under /election-2026/). */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  const clean = path.replace(/^\/+/, '');
  return base + clean;
}

export const NAV = [
  { href: 'quiz/', label: 'שאלון' },
  { href: 'parties/', label: 'המפלגות' },
  { href: 'issues/', label: 'הנושאים' },
  { href: 'compare/', label: 'השוואה' },
  { href: 'how-to-vote/', label: 'איך מצביעים' },
  { href: 'about/', label: 'אודות ושיטה' },
] as const;
