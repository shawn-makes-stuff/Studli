import { useEffect, useRef, useState } from 'react';
import TuneIcon from '@mui/icons-material/Tune';

interface ColorPopoutProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor: string;
  isDefault: boolean;
  onDefaultSelect: () => void;
  onColorSelect: (color: string) => void;
  anchorRef: React.RefObject<HTMLElement>;
}

// Common LEGO brick colors
const PRESET_COLORS = [
  { name: 'Red', value: '#C91A09' },
  { name: 'Blue', value: '#0055BF' },
  { name: 'Yellow', value: '#F2CD37' },
  { name: 'Green', value: '#237841' },
  { name: 'Orange', value: '#FE8A18' },
  { name: 'Purple', value: '#81007B' },
  { name: 'Pink', value: '#FC97AC' },
  { name: 'Lime', value: '#BBE90B' },
  { name: 'Teal', value: '#008F9B' },
  { name: 'Brown', value: '#582A12' },
  { name: 'Tan', value: '#E4CD9E' },
  { name: 'Dark Gray', value: '#6C6E68' },
  { name: 'Black', value: '#05131D' },
  { name: 'White', value: '#F2F3F2' },
  { name: 'Dark Blue', value: '#0A3463' },
  { name: 'Dark Green', value: '#184632' },
  { name: 'Dark Red', value: '#720E0F' },
];

export const ColorPopout = ({
  isOpen,
  onClose,
  currentColor,
  isDefault,
  onDefaultSelect,
  onColorSelect,
  anchorRef: _anchorRef,
}: ColorPopoutProps) => {
  const [customColor, setCustomColor] = useState(currentColor);
  const [customHexInput, setCustomHexInput] = useState(currentColor);
  const [customHsl, setCustomHsl] = useState<{ h: number; s: number; l: number }>({ h: 0, s: 0, l: 0 });
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const popoutRef = useRef<HTMLDivElement>(null);

  const viewportWidth = typeof window === 'undefined' ? 0 : window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 0 : window.visualViewport?.height ?? window.innerHeight;
  const isTinyScreen = viewportWidth > 0 && (viewportWidth < 360 || viewportHeight < 420);

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const normalizeHex = (hex: string): string | null => {
    const raw = hex.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(raw)) {
      const r = raw[0];
      const g = raw[1];
      const b = raw[2];
      return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
    }
    if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`.toUpperCase();
    return null;
  };

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const normalized = normalizeHex(hex);
    if (!normalized) return null;
    const raw = normalized.slice(1);
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return { r, g, b };
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  };

  const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;

    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case rn:
          h = ((gn - bn) / delta) % 6;
          break;
        case gn:
          h = (bn - rn) / delta + 2;
          break;
        default:
          h = (rn - gn) / delta + 4;
          break;
      }
      h *= 60;
      if (h < 0) h += 360;
    }

    return { h, s: s * 100, l: l * 100 };
  };

  const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
    const hn = ((h % 360) + 360) % 360;
    const sn = clamp(s, 0, 100) / 100;
    const ln = clamp(l, 0, 100) / 100;

    const c = (1 - Math.abs(2 * ln - 1)) * sn;
    const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
    const m = ln - c / 2;

    let r1 = 0;
    let g1 = 0;
    let b1 = 0;

    if (hn < 60) [r1, g1, b1] = [c, x, 0];
    else if (hn < 120) [r1, g1, b1] = [x, c, 0];
    else if (hn < 180) [r1, g1, b1] = [0, c, x];
    else if (hn < 240) [r1, g1, b1] = [0, x, c];
    else if (hn < 300) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];

    return {
      r: (r1 + m) * 255,
      g: (g1 + m) * 255,
      b: (b1 + m) * 255
    };
  };

  const hslToHex = (h: number, s: number, l: number): string => {
    const { r, g, b } = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
  };

  const setCustomFromHex = (hex: string) => {
    const normalized = normalizeHex(hex);
    if (!normalized) return;
    const rgb = hexToRgb(normalized);
    if (!rgb) return;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    setCustomColor(normalized);
    setCustomHexInput(normalized);
    setCustomHsl({
      h: Math.round(hsl.h),
      s: Math.round(hsl.s),
      l: Math.round(hsl.l)
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    setCustomFromHex(currentColor);
  }, [currentColor, isOpen]);

  useEffect(() => {
    if (!isOpen) setIsCustomPickerOpen(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePresetSelect = (color: string) => {
    onColorSelect(color);
    onClose();
  };

  const handleDefaultClick = () => {
    onDefaultSelect();
    onClose();
  };

  const applyCustomHsl = (next: { h: number; s: number; l: number }) => {
    const normalized = {
      h: clamp(next.h, 0, 360),
      s: clamp(next.s, 0, 100),
      l: clamp(next.l, 0, 100)
    };
    setCustomHsl(normalized);
    const hex = hslToHex(normalized.h, normalized.s, normalized.l);
    setCustomColor(hex);
    setCustomHexInput(hex);
    onColorSelect(hex);
  };

  const handleCustomHexChange = (value: string) => {
    setCustomHexInput(value);
    const normalized = normalizeHex(value);
    if (!normalized) return;
    const rgb = hexToRgb(normalized);
    if (!rgb) return;
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    setCustomColor(normalized);
    setCustomHsl({
      h: Math.round(hsl.h),
      s: Math.round(hsl.s),
      l: Math.round(hsl.l)
    });
    onColorSelect(normalized);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] pointer-events-auto"
      >
        <button
          className="absolute inset-0 bg-black/50"
          aria-label="Close color picker"
          onClick={onClose}
        />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            ref={popoutRef}
            className="w-[92vw] max-w-sm max-h-[85vh] overflow-y-auto bg-gray-800 rounded-xl shadow-2xl border border-gray-600 p-4"
            style={{ minWidth: '280px' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {isTinyScreen ? (
              <div className="flex justify-end -mt-1 mb-2">
                <button
                  onClick={onClose}
                  className="text-gray-200 hover:text-white p-1 -m-1 touch-manipulation"
                  aria-label="Close color picker"
                  title="Close"
                >
                  X
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white font-semibold text-sm">Select Color</h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white p-1 -m-1 touch-manipulation"
                  aria-label="Close color picker"
                  title="Close"
                >
                  X
                </button>
              </div>
            )}

            {/* Preset Colors */}
            <div
              className={`${isTinyScreen ? 'grid grid-rows-2 grid-flow-col auto-cols-max gap-2 overflow-x-auto pb-1 -mx-1 px-1' : 'grid grid-cols-6 gap-2'} mb-3`}
              style={isTinyScreen ? { WebkitOverflowScrolling: 'touch' } : undefined}
            >
              <button
                onClick={handleDefaultClick}
                className={`
              w-10 h-10 rounded-lg border-2 transition-all active:scale-95 touch-manipulation flex items-center justify-center
              ${isDefault
                ? 'border-white ring-2 ring-blue-500'
                : 'border-gray-600 hover:border-gray-400 bg-gray-700/60'
              }
            `}
                title="Default color"
              >
                <span className="text-white font-black text-[22px] leading-none drop-shadow-sm translate-y-[1px] select-none">
                  *
                </span>
              </button>

              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handlePresetSelect(color.value)}
                  className={`
                w-10 h-10 rounded-lg border-2 transition-all active:scale-95 touch-manipulation
                ${!isDefault && currentColor.toLowerCase() === color.value.toLowerCase()
                  ? 'border-white ring-2 ring-blue-500'
                  : 'border-gray-600 hover:border-gray-400'
                }
              `}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>

            {/* Custom Color Option */}
            <div className="pt-3 border-t border-gray-700">
              <button
                onClick={() => setIsCustomPickerOpen(true)}
                className="w-full p-3 rounded-lg bg-gray-700 hover:bg-gray-600 active:bg-gray-500 transition-colors touch-manipulation flex items-center gap-3"
                title="Custom color"
              >
                <div
                  className="w-8 h-8 rounded border-2 border-gray-500 flex-shrink-0"
                  style={{ backgroundColor: customColor }}
                />
                <div className="flex-1 text-left">
                  <div className="text-white text-sm font-medium">Custom Color</div>
                  <div className="text-xs text-gray-300">{customHexInput || customColor}</div>
                </div>
                <TuneIcon className="text-gray-200" fontSize="small" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isCustomPickerOpen && (
        <div className="fixed inset-0 z-[70] pointer-events-auto">
          <button
            className="absolute inset-0 bg-black/60"
            aria-label="Close custom color picker"
            onClick={() => setIsCustomPickerOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-[92vw] max-w-sm max-h-[85vh] overflow-y-auto rounded-xl bg-gray-900 border border-gray-700 shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <h2 className="text-white font-semibold">Custom Color</h2>
                <button
                  onClick={() => setIsCustomPickerOpen(false)}
                  className="text-gray-300 hover:text-white p-1 -m-1"
                  aria-label="Close"
                  title="Close"
                >
                  X
                </button>
              </div>
              <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg border-2 border-gray-600 flex-shrink-0"
                  style={{ backgroundColor: customColor }}
                />
                <div className="flex-1">
                  <label className="block text-xs text-gray-300 mb-1" htmlFor="customHex">
                    Hex
                  </label>
                  <input
                    id="customHex"
                    value={customHexInput}
                    onChange={(e) => handleCustomHexChange(e.target.value)}
                    spellCheck={false}
                    className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    inputMode="text"
                    placeholder="#RRGGBB"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-300">Hue</span>
                  <span className="text-xs text-gray-400">{Math.round(customHsl.h)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={customHsl.h}
                  onChange={(e) => applyCustomHsl({ ...customHsl, h: Number(e.target.value) })}
                  className="w-full touch-manipulation"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-300">Saturation</span>
                  <span className="text-xs text-gray-400">{Math.round(customHsl.s)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={customHsl.s}
                  onChange={(e) => applyCustomHsl({ ...customHsl, s: Number(e.target.value) })}
                  className="w-full touch-manipulation"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-300">Lightness</span>
                  <span className="text-xs text-gray-400">{Math.round(customHsl.l)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={customHsl.l}
                  onChange={(e) => applyCustomHsl({ ...customHsl, l: Number(e.target.value) })}
                  className="w-full touch-manipulation"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsCustomPickerOpen(false)}
                  className="px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-white text-sm border border-gray-700 active:scale-95 transition"
                >
                  Done
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
