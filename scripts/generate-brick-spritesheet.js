import { createServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer';

const OUT_DIR = path.resolve(process.cwd(), 'public');
const OUT_PNG = path.join(OUT_DIR, 'brick-thumbs.png');
const OUT_JSON = path.join(OUT_DIR, 'brick-thumbs.json');

const toBufferFromDataUrl = (dataUrl) => {
  const idx = dataUrl.indexOf(',');
  if (idx === -1) throw new Error('Invalid data URL');
  const base64 = dataUrl.slice(idx + 1);
  return Buffer.from(base64, 'base64');
};

const main = async () => {
  const vite = await createServer({
    logLevel: 'error',
    server: { port: 5178, strictPort: false },
  });

  await vite.listen();
  const baseUrl = vite.resolvedUrls?.local?.[0];
  if (!baseUrl) throw new Error('Failed to start Vite dev server');

  const pageUrl = new URL('/scripts/spritesheet.html', baseUrl).toString();
  console.log(`Vite: ${baseUrl}`);
  console.log(`Page: ${pageUrl}`);

  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    page.on('console', (msg) => console.log(`[page] ${msg.text()}`));

    await page.goto(pageUrl, { waitUntil: 'networkidle0' });

    const result = await page.evaluate(async () => {
      if (!window.__generateBrickSpritesheet) return null;
      return window.__generateBrickSpritesheet({ columns: 10, tileSize: 80, imageFile: 'brick-thumbs.png' });
    });

    if (!result) throw new Error('Generator did not return a result');

    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(OUT_PNG, toBufferFromDataUrl(result.pngDataUrl));
    await fs.writeFile(OUT_JSON, JSON.stringify(result.json, null, 2));

    console.log(`Wrote: ${path.relative(process.cwd(), OUT_PNG)}`);
    console.log(`Wrote: ${path.relative(process.cwd(), OUT_JSON)}`);
  } finally {
    await browser.close().catch(() => {});
    await vite.close().catch(() => {});
  }
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

