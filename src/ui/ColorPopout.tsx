import { useState, useRef, useEffect } from 'react';

interface ColorPopoutProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor: string;
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
  { name: 'Light Gray', value: '#9BA19D' },
  { name: 'Black', value: '#05131D' },
  { name: 'White', value: '#F2F3F2' },
  { name: 'Dark Blue', value: '#0A3463' },
  { name: 'Dark Green', value: '#184632' },
  { name: 'Dark Red', value: '#720E0F' },
];

export const ColorPopout = ({ isOpen, onClose, currentColor, onColorSelect, anchorRef }: ColorPopoutProps) => {
  const [customColor, setCustomColor] = useState(currentColor);
  const popoutRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        popoutRef.current &&
        !popoutRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    onClose();
  };

  const handleCustomColorClick = () => {
    setTimeout(() => customInputRef.current?.click(), 0);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value);
    onColorSelect(e.target.value);
  };

  return (
    <div
      ref={popoutRef}
      className="absolute bottom-full left-0 mb-2 bg-gray-800/98 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-600 p-4 z-50"
      style={{ minWidth: '280px' }}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold text-sm">Select Color</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 -m-1 touch-manipulation"
        >
          ✕
        </button>
      </div>

      {/* Preset Colors Grid */}
      <div className="grid grid-cols-6 gap-2 mb-3">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => handleColorSelect(color.value)}
            className={`
              w-10 h-10 rounded-lg border-2 transition-all active:scale-95 touch-manipulation
              ${currentColor.toLowerCase() === color.value.toLowerCase()
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
          onClick={handleCustomColorClick}
          className="w-full p-3 rounded-lg bg-gray-700 hover:bg-gray-600 active:bg-gray-500 transition-colors touch-manipulation flex items-center gap-3"
        >
          <div
            className="w-8 h-8 rounded border-2 border-gray-500 flex-shrink-0"
            style={{ backgroundColor: customColor }}
          />
          <span className="text-white text-sm font-medium">Custom Color</span>
          <input
            ref={customInputRef}
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="sr-only"
          />
        </button>
      </div>
    </div>
  );
};
