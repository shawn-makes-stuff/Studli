import { useBrickStore } from '../store/useBrickStore';

const COLORS = [
  '#e53935', // Red
  '#1e88e5', // Blue
  '#43a047', // Green
  '#fdd835', // Yellow
  '#fb8c00', // Orange
  '#8e24aa', // Purple
  '#00acc1', // Cyan
  '#f5f5f5', // White
  '#424242', // Dark Gray
  '#212121', // Black
];

interface ColorPickerProps {
  onColorSelect?: (color: string) => void;
}

export const ColorPicker = ({ onColorSelect }: ColorPickerProps) => {
  const selectedColor = useBrickStore((state) => state.selectedColor);
  const setSelectedColor = useBrickStore((state) => state.setSelectedColor);

  const handleColorClick = (color: string) => {
    setSelectedColor(color);

    onColorSelect?.(color);
  };

  return (
    <div className="grid grid-cols-5 gap-2">
      {COLORS.map((color) => (
        <button
          key={color}
          onClick={() => handleColorClick(color)}
          className={`
            w-10 h-10 rounded-lg border-2 transition-all
            ${selectedColor === color
              ? 'border-white scale-110'
              : 'border-gray-600 hover:border-gray-400'
            }
          `}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
};

export { COLORS };
