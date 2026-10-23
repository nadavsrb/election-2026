// Renders public/og.png (1200x630), the link preview image for WhatsApp and social networks.
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

// Fonts are inlined as data URLs: a page created with setContent cannot load file:// URLs reliably.
const font = (pkg, file) =>
  `data:font/woff2;base64,${readFileSync(new URL(`../node_modules/@fontsource/${pkg}/files/${file}`, import.meta.url)).toString('base64')}`;
const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>
@font-face { font-family: Frank; font-weight: 900; src: url(${font('frank-ruhl-libre', 'frank-ruhl-libre-hebrew-900-normal.woff2')}); }
@font-face { font-family: Plex; font-weight: 500; src: url(${font('ibm-plex-sans-hebrew', 'ibm-plex-sans-hebrew-hebrew-500-normal.woff2')}); unicode-range: U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F; }
@font-face { font-family: Plex; font-weight: 500; src: url(${font('ibm-plex-sans-hebrew', 'ibm-plex-sans-hebrew-latin-500-normal.woff2')}); unicode-range: U+0000-00FF; }
html, body { margin: 0; width: 1200px; height: 630px; }
body { background: radial-gradient(120% 90% at 15% 10%, #30265f 0%, transparent 60%), #221a47; color: #f4f1ff;
  display: flex; align-items: center; justify-content: space-between; padding: 0 90px; box-sizing: border-box; font-family: Plex; }
.copy { max-width: 600px; }
h1 { font-family: Frank; font-weight: 900; font-size: 84px; line-height: 1.02; margin: 0; }
p { font-size: 34px; line-height: 1.35; margin: 26px 0 0; color: #c9c0ec; }
.meta { font-size: 26px; margin-top: 34px; color: #f4f1ff; }
.stack { position: relative; width: 330px; height: 420px; }
.slip { position: absolute; inset: 0; background: #fff; border: 1px solid rgba(20,10,50,.2);
  box-shadow: 0 30px 50px -25px rgba(0,0,0,.6); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; color: #000; }
.b2 { transform: rotate(9deg) translate(-20px, 6px); opacity: .5; }
.b1 { transform: rotate(-7deg) translate(16px, 4px); opacity: .8; }
.front { transform: rotate(-2.5deg); }
.slots { display: flex; gap: 14px; }
.slots span { width: 64px; height: 80px; border: 3px dashed #8a83a3; border-radius: 5px; }
.name { font-family: Frank; font-weight: 900; font-size: 50px; }
</style></head><body>
<div class="copy">
  <h1>מצאו את הרשימות הקרובות לעמדות שלכם</h1>
  <p>שאלון קצר, עמדות של 13 רשימות עם מקורות, ומדריך הצבעה. בלי הרשמה ובלי מעקב.</p>
  <div class="meta">הבחירות לכנסת ה-26: יום שלישי, 27 באוקטובר 2026</div>
</div>
<div class="stack"><div class="slip b2"></div><div class="slip b1"></div>
<div class="slip front"><div class="slots"><span></span><span></span><span></span></div><div class="name">הפתק שלי</div></div></div>
</body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(async () => {
  await Promise.all([document.fonts.load('500 30px Plex', 'אב 12'), document.fonts.load('900 60px Frank', 'אב')]);
  await document.fonts.ready;
});
const out = fileURLToPath(new URL('../public/og.png', import.meta.url));
await page.screenshot({ path: out });
await browser.close();
console.log('wrote', out);
