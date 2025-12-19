export type BrickSpriteSheetEntry = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type BrickSpriteSheet = {
  version: number;
  imageFile: string;
  tileSize: number;
  sheetWidth: number;
  sheetHeight: number;
  entries: Record<string, BrickSpriteSheetEntry>;
  imageUrl: string;
};

let loadedSheet: BrickSpriteSheet | null = null;
let loadPromise: Promise<BrickSpriteSheet | null> | null = null;

const withBaseUrl = (file: string) => {
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } })?.env?.BASE_URL ?? '/';
  return `${base}${file}`.replace(/([^:]\/)\/+/g, '$1');
};

export const loadBrickSpriteSheet = async (): Promise<BrickSpriteSheet | null> => {
  if (loadedSheet) return loadedSheet;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const res = await fetch(withBaseUrl('brick-thumbs.json'), { cache: 'force-cache' });
      if (!res.ok) return null;
      const json = (await res.json()) as Omit<BrickSpriteSheet, 'imageUrl'>;
      if (!json || typeof json !== 'object') return null;
      if (!json.entries || typeof json.tileSize !== 'number') return null;
      const sheet: BrickSpriteSheet = {
        ...(json as BrickSpriteSheet),
        imageUrl: withBaseUrl((json as BrickSpriteSheet).imageFile ?? 'brick-thumbs.png'),
      };
      loadedSheet = sheet;
      return sheet;
    } catch {
      return null;
    }
  })();

  const result = await loadPromise;
  if (!result) loadPromise = null;
  return result;
};

