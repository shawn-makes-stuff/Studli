import { useState, useRef, useEffect, useMemo } from 'react';
import { BRICK_TYPES, BrickType, BrickVariant } from '../types/brick';
import { BrickThumbnail } from './BrickThumbnail';
import { SearchIcon, CloseIcon } from './Icons';

interface BrickPickerPopoutProps {
  isOpen: boolean;
  onClose: () => void;
  currentBrick: BrickType | null;
  onBrickSelect: (brick: BrickType) => void;
  anchorRef: React.RefObject<HTMLElement>;
}

type CategoryKey = 'all' | 'bricks' | 'plates' | 'tiles' | 'slopes';

const CATEGORIES: Record<CategoryKey, { title: string; variant?: BrickVariant | 'all' }> = {
  all: { title: 'All', variant: 'all' },
  bricks: { title: 'Bricks', variant: 'brick' },
  plates: { title: 'Plates', variant: 'plate' },
  tiles: { title: 'Tiles', variant: 'tile' },
  slopes: { title: 'Slopes', variant: 'slope' }
};

export const BrickPickerPopout = ({ isOpen, onClose, currentBrick, onBrickSelect, anchorRef }: BrickPickerPopoutProps) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const popoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setIsLoading(false);
    } else {
      // Show loading immediately when opening
      setIsLoading(true);
      // Wait for thumbnails to render
      const timer = setTimeout(() => setIsLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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

  const filteredBricks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return BRICK_TYPES.filter(brick => {
      // Filter by category
      const categoryMatch = selectedCategory === 'all' ||
        brick.variant === CATEGORIES[selectedCategory].variant ||
        (selectedCategory === 'slopes' && (brick.variant === 'slope' || brick.variant === 'corner-slope'));

      // Filter by search
      const searchMatch = !query ||
        brick.name.toLowerCase().includes(query) ||
        brick.id.toLowerCase().includes(query);

      return categoryMatch && searchMatch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleBrickSelect = (brick: BrickType) => {
    onBrickSelect(brick);
    onClose();
  };

  return (
    <div
      ref={popoutRef}
      className="fixed inset-x-4 bottom-20 sm:absolute sm:inset-x-auto sm:bottom-full sm:left-1/2 sm:-translate-x-1/2 sm:mb-4 bg-gray-800/98 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-600 z-50 max-h-[70vh] sm:max-h-[600px] flex flex-col"
      style={{ width: 'calc(100vw - 2rem)', maxWidth: '600px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-white font-semibold">Select Brick</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 -m-1 touch-manipulation"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-gray-700 flex-shrink-0">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bricks..."
            className="w-full pl-10 pr-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-sm placeholder-gray-400"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-3 border-b border-gray-700 overflow-x-auto flex-shrink-0">
        {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap touch-manipulation
              ${selectedCategory === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
          >
            {CATEGORIES[key].title}
          </button>
        ))}
      </div>

      {/* Brick Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-4 border-gray-600 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {filteredBricks.map((brick) => (
                <button
                  key={brick.id}
                  onClick={() => handleBrickSelect(brick)}
                  className={`
                    p-2 rounded-lg border-2 transition-all active:scale-95 touch-manipulation
                    ${currentBrick?.id === brick.id
                      ? 'border-blue-500 bg-blue-600/20'
                      : 'border-gray-600 hover:border-gray-400 bg-gray-700/50'
                    }
                  `}
                  title={brick.name}
                >
                  <div className="aspect-square flex items-center justify-center mb-1">
                    <BrickThumbnail brickType={brick} color={brick.color} size={60} />
                  </div>
                  <div className="text-xs text-gray-300 text-center truncate">
                    {brick.name}
                  </div>
                </button>
              ))}
            </div>
            {filteredBricks.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No bricks found
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
