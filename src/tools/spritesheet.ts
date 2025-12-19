import { BRICK_TYPES } from '../types/brick';
import { DEFAULT_THUMBNAIL_TILE_SIZE, renderBrickThumbnailDataUrl } from '../utils/brickThumbnailRenderer';

type GenerateOptions = {
  columns?: number;
  tileSize?: number;
  imageFile?: string;
};

type SpritesheetJson = {
  version: number;
  imageFile: string;
  tileSize: number;
  sheetWidth: number;
  sheetHeight: number;
  entries: Record<string, { x: number; y: number; w: number; h: number }>;
};

const byId = (id: string) => document.getElementById(id);

const setText = (id: string, text: string) => {
  const el = byId(id);
  if (el) el.textContent = text;
};

const createUi = () => {
  const mount = byId('app');
  if (!mount) return;

  mount.innerHTML = `
    <div class="row" style="margin-top: 12px;">
      <label class="muted">Columns</label>
      <input id="cols" type="number" min="4" max="24" value="10" style="width: 90px; padding: 6px 8px; border-radius: 8px; border: 1px solid rgba(55,65,81,0.8); background: rgba(3,7,18,0.6); color: #e5e7eb;" />
      <label class="muted">Tile</label>
      <input id="tile" type="number" min="48" max="160" value="${DEFAULT_THUMBNAIL_TILE_SIZE}" style="width: 90px; padding: 6px 8px; border-radius: 8px; border: 1px solid rgba(55,65,81,0.8); background: rgba(3,7,18,0.6); color: #e5e7eb;" />
      <button id="run" style="padding: 8px 10px; border-radius: 10px; background: #2563eb; color: white; border: 1px solid rgba(37,99,235,0.6); cursor: pointer;">Generate</button>
    </div>
    <div class="muted" style="margin-top: 10px;">Status: <span id="status">idle</span></div>
    <div class="muted" style="margin-top: 4px;">Progress: <span id="progress">0</span> / <span id="total">${BRICK_TYPES.length}</span></div>
    <div class="row" style="margin-top: 12px;">
      <a id="downloadPng" style="display:none; color:#93c5fd;" download="brick-thumbs.png">Download PNG</a>
      <a id="downloadJson" style="display:none; color:#93c5fd;" download="brick-thumbs.json">Download JSON</a>
    </div>
  `;
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });

export const generateBrickSpritesheet = async (opts: GenerateOptions = {}) => {
  const columns = Math.max(4, Math.min(24, Math.floor(opts.columns ?? 10)));
  const tileSize = Math.max(48, Math.min(160, Math.floor(opts.tileSize ?? DEFAULT_THUMBNAIL_TILE_SIZE)));
  const imageFile = opts.imageFile ?? 'brick-thumbs.png';

  setText('status', 'rendering thumbnails…');
  setText('progress', '0');

  const rows = Math.ceil(BRICK_TYPES.length / columns);
  const sheetWidth = columns * tileSize;
  const sheetHeight = rows * tileSize;

  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');

  ctx.clearRect(0, 0, sheetWidth, sheetHeight);

  const entries: SpritesheetJson['entries'] = {};

  for (let i = 0; i < BRICK_TYPES.length; i++) {
    const brick = BRICK_TYPES[i];
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = col * tileSize;
    const y = row * tileSize;

    const dataUrl = renderBrickThumbnailDataUrl(brick, brick.color, tileSize);
    const img = await loadImage(dataUrl);
    ctx.drawImage(img, x, y, tileSize, tileSize);

    entries[brick.id] = { x, y, w: tileSize, h: tileSize };
    setText('progress', String(i + 1));
  }

  setText('status', 'encoding…');

  const pngDataUrl = canvas.toDataURL('image/png');
  const json: SpritesheetJson = {
    version: 1,
    imageFile,
    tileSize,
    sheetWidth,
    sheetHeight,
    entries
  };

  setText('status', 'done');

  const dlPng = byId('downloadPng') as HTMLAnchorElement | null;
  const dlJson = byId('downloadJson') as HTMLAnchorElement | null;
  if (dlPng) {
    dlPng.style.display = 'inline';
    dlPng.href = pngDataUrl;
  }
  if (dlJson) {
    dlJson.style.display = 'inline';
    const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
    dlJson.href = URL.createObjectURL(blob);
  }

  return { pngDataUrl, json };
};

declare global {
  interface Window {
    __generateBrickSpritesheet?: (opts?: GenerateOptions) => Promise<{ pngDataUrl: string; json: SpritesheetJson }>;
  }
}

window.__generateBrickSpritesheet = generateBrickSpritesheet;

createUi();

const runButton = byId('run');
if (runButton) {
  runButton.addEventListener('click', async () => {
    const cols = Number((byId('cols') as HTMLInputElement | null)?.value ?? '10');
    const tile = Number((byId('tile') as HTMLInputElement | null)?.value ?? String(DEFAULT_THUMBNAIL_TILE_SIZE));
    try {
      await generateBrickSpritesheet({ columns: cols, tileSize: tile });
    } catch (e) {
      setText('status', `error: ${(e as Error).message}`);
    }
  });
}

