/**
 * Brick thumbnail preview.
 * Prefers a prebuilt spritesheet (fast). Falls back to Three.js thumbnail rendering (slow).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BrickType } from '../types/brick';
import { DEFAULT_THUMBNAIL_TILE_SIZE, renderBrickThumbnailDataUrl } from '../utils/brickThumbnailRenderer';
import { loadBrickSpriteSheet, type BrickSpriteSheet } from '../utils/brickSpriteSheet';

interface BrickThumbnailProps {
  brickType: BrickType;
  color: string;
  size?: number;
}

export const BrickThumbnail = ({ brickType, color, size = 40 }: BrickThumbnailProps) => {
  const [spriteSheet, setSpriteSheet] = useState<BrickSpriteSheet | null | 'missing'>('missing');
  const [spriteState, setSpriteState] = useState<'unknown' | 'useSprite' | 'noSprite'>('unknown');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const renderScheduled = useRef(false);

  const normalizedColor = useMemo(() => color.trim().toLowerCase(), [color]);
  const normalizedDefaultColor = useMemo(() => brickType.color.trim().toLowerCase(), [brickType.color]);
  const canUseSpriteForThis = normalizedColor === normalizedDefaultColor;

  useEffect(() => {
    let cancelled = false;
    setSpriteState('unknown');

    if (!canUseSpriteForThis) {
      setSpriteState('noSprite');
      return;
    }

    loadBrickSpriteSheet().then((sheet) => {
      if (cancelled) return;
      setSpriteSheet(sheet ?? 'missing');
      if (!sheet?.entries?.[brickType.id]) {
        setSpriteState('noSprite');
      } else {
        setSpriteState('useSprite');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [brickType.id, canUseSpriteForThis]);

  useEffect(() => {
    if (spriteState !== 'noSprite') return;

    // Debounce rendering slightly to batch updates
    if (renderScheduled.current) return;
    renderScheduled.current = true;

    requestAnimationFrame(() => {
      const src = renderBrickThumbnailDataUrl(brickType, color, DEFAULT_THUMBNAIL_TILE_SIZE);
      setImageSrc(src);
      renderScheduled.current = false;
    });
  }, [brickType, color, spriteState]);

  if (spriteState === 'useSprite' && spriteSheet !== 'missing' && spriteSheet) {
    const entry = spriteSheet.entries[brickType.id];
    const scale = size / spriteSheet.tileSize;

    return (
      <div
        style={{ width: size, height: size }}
        className="rounded border-2 border-gray-600 overflow-hidden flex-shrink-0 bg-gray-800"
      >
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url(${spriteSheet.imageUrl})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${spriteSheet.sheetWidth * scale}px ${spriteSheet.sheetHeight * scale}px`,
            backgroundPosition: `${-entry.x * scale}px ${-entry.y * scale}px`,
            imageRendering: 'auto'
          }}
          aria-label={brickType.name}
        />
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded border-2 border-gray-600 overflow-hidden flex-shrink-0 bg-gray-800"
    >
      {spriteState === 'unknown' ? null : imageSrc && (
        <img
          src={imageSrc}
          alt={brickType.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )}
    </div>
  );
};
