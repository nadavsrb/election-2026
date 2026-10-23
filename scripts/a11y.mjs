// Runs axe-core accessibility checks on built pages (light and dark).
// Expects `npm run preview` on http://localhost:4321/election-2026/
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const axeSource = readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const base = process.env.BASE_URL ?? 'http://localhost:4321/election-2026/';
const pages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['', 'quiz/?mode=quick', 'parties/', 'parties/likud/', 'issues/', 'issues/draft/', 'compare/?p=likud,yashar', 'how-to-vote/', 'about/'];

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' });
let total = 0;
for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
  const page = await context.newPage();
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(async () =>
      // @ts-ignore
      await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }),
    );
    for (const v of result.violations) {
      total++;
      console.log(`[${scheme}] /${p} ${v.impact} ${v.id}: ${v.help} (${v.nodes.length})`);
      for (const n of v.nodes.slice(0, 3)) console.log(`    ${n.target.join(' ')} :: ${n.failureSummary?.split('\n')[1] ?? ''}`);
    }
  }
  await context.close();
}
await browser.close();
console.log(total ? `${total} violation group(s)` : 'no axe violations');
