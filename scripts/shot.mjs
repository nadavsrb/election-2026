// Screenshot pages of the built site in phone and desktop sizes, light and dark.
// Usage: node scripts/shot.mjs [--dark] [--desktop] [--full] path1 path2 ...
// Expects `npm run preview` (or another server) on http://localhost:4321/election-2026/
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const paths = args.filter((a) => !a.startsWith('--'));
const base = process.env.BASE_URL ?? 'http://localhost:4321/election-2026/';
const outDir = process.env.SHOT_DIR ?? 'screenshots';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium',
});
const viewport = flags.has('--desktop') ? { width: 1280, height: 860 } : { width: 390, height: 844 };
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: flags.has('--desktop') ? 1 : 2,
  colorScheme: flags.has('--dark') ? 'dark' : 'light',
  locale: 'he-IL',
  timezoneId: 'Asia/Jerusalem',
});
const page = await context.newPage();
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));

for (const p of paths.length ? paths : ['']) {
  await page.goto(base + p.replace(/^\//, ''), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const name = `${(p || 'home').replace(/[^\w-]+/g, '_')}${flags.has('--dark') ? '-dark' : ''}${flags.has('--desktop') ? '-desktop' : ''}.png`;
  await page.screenshot({ path: `${outDir}/${name}`, fullPage: flags.has('--full') });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  console.log(`${outDir}/${name}${overflow ? '  ⚠ horizontal overflow' : ''}`);
}
if (problems.length) console.log(problems.join('\n'));
await browser.close();
