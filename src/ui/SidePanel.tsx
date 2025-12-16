import { useState, useMemo, useEffect } from 'react';
import { BRICK_TYPES, BrickType, BrickVariant } from '../types/brick';
import { useBrickStore } from '../store/useBrickStore';
import { ColorPicker } from './ColorPicker';
import { BrickThumbnail } from './BrickThumbnail';
import {
  MenuIcon,
  CloseIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SearchIcon
} from './Icons';

interface BrickButtonProps {
  brickType: BrickType;
  isSelected: boolean;
  onClick: () => void;
  previewColor: string;
}

const BrickButton = ({ brickType, isSelected, onClick, previewColor }: BrickButtonProps) => (
  <button
    onClick={onClick}
    className={`
      w-full p-3 rounded-lg text-left transition-all
      ${isSelected
        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
        : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
      }
    `}
  >
    <div className="flex items-center gap-3">
      <BrickThumbnail brickType={brickType} color={previewColor} size={40} />
      <div className="min-w-0">
        <div className="font-medium truncate">{brickType.name}</div>
        <div className="text-xs text-gray-400 capitalize">
          {brickType.isInverted ? 'inverted ' : ''}{brickType.variant.replace('-', ' ')}
        </div>
      </div>
    </div>
  </button>
);

interface CategorySectionProps {
  title: string;
  description?: string;
  bricks: BrickType[];
  isExpanded: boolean;
  onToggle: () => void;
  selectedBrickType: BrickType | null;
  onBrickClick: (brick: BrickType) => void;
  previewColor: string;
}

const CategorySection = ({
  title,
  description,
  bricks,
  isExpanded,
  onToggle,
  selectedBrickType,
  onBrickClick,
  previewColor
}: CategorySectionProps) => (
  <div>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between text-sm font-semibold text-gray-400 uppercase mb-2 hover:text-gray-300 transition-colors"
    >
      <div>
        <span>{title}</span>
        <span className="ml-2 text-xs text-gray-500">({bricks.length})</span>
      </div>
      {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
    </button>

    {description && isExpanded && (
      <p className="text-xs text-gray-500 mb-2">{description}</p>
    )}

    {isExpanded && (
      <div className="flex flex-col gap-2 mb-4">
        {bricks.map((brick) => (
          <BrickButton
            key={brick.id}
            brickType={brick}
            isSelected={selectedBrickType?.id === brick.id}
            onClick={() => onBrickClick(brick)}
            previewColor={previewColor}
          />
        ))}
      </div>
    )}
  </div>
);

const PANEL_WIDTH = 280;

type CategoryKey = 'bricks' | 'plates' | 'tiles' | 'slopes';

const CATEGORY_CONFIG: Record<CategoryKey, { title: string; variant: BrickVariant; description?: string }> = {
  bricks: { title: 'Bricks', variant: 'brick' },
  plates: { title: 'Plates', variant: 'plate' },
  tiles: { title: 'Tiles', variant: 'tile', description: 'Smooth top - no stacking' },
  slopes: { title: 'Slopes', variant: 'slope', description: 'Angled pieces for roofs and vehicles' }
};

const filterBricksByCategory = (query: string) => {
  const normalizedQuery = query.toLowerCase().trim();

  const filter = (variant: BrickVariant) =>
    BRICK_TYPES.filter(b =>
      b.variant === variant &&
      (!normalizedQuery ||
        b.name.toLowerCase().includes(normalizedQuery) ||
        b.id.toLowerCase().includes(normalizedQuery))
    );

  // Include corner-slopes in the slopes category
  const slopeFilter = () =>
    BRICK_TYPES.filter(b =>
      (b.variant === 'slope' || b.variant === 'corner-slope') &&
      (!normalizedQuery ||
        b.name.toLowerCase().includes(normalizedQuery) ||
        b.id.toLowerCase().includes(normalizedQuery))
    );

  return {
    bricks: filter('brick'),
    plates: filter('plate'),
    tiles: filter('tile'),
    slopes: slopeFilter()
  };
};

export const SidePanel = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<CategoryKey, boolean>>({
    bricks: true,
    plates: false,
    tiles: false,
    slopes: false
  });
  const [savedExpandedState, setSavedExpandedState] = useState<Record<CategoryKey, boolean> | null>(null);

  const selectedBrickType = useBrickStore((state) => state.selectedBrickType);
  const setSelectedBrickType = useBrickStore((state) => state.setSelectedBrickType);
  const selectedColor = useBrickStore((state) => state.selectedColor);
  const layerOffset = useBrickStore((state) => state.layerOffset);
  const resetLayerOffset = useBrickStore((state) => state.resetLayerOffset);
  const selectedBrickIds = useBrickStore((state) => state.selectedBrickIds);
  const mode = useBrickStore((state) => state.mode);
  const placedBricks = useBrickStore((state) => state.placedBricks);

  const toggleCategory = (category: CategoryKey) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    if (!searchQuery) {
      setSavedExpandedState(prev => prev
        ? { ...prev, [category]: !prev[category] }
        : { ...expandedCategories, [category]: !expandedCategories[category] }
      );
    }
  };

  const filteredBricks = useMemo(() => filterBricksByCategory(searchQuery), [searchQuery]);

  // Auto-expand categories with search results
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();

    if (query) {
      if (savedExpandedState === null) {
        setSavedExpandedState(expandedCategories);
      }
      setExpandedCategories({
        bricks: filteredBricks.bricks.length > 0,
        plates: filteredBricks.plates.length > 0,
        tiles: filteredBricks.tiles.length > 0,
        slopes: filteredBricks.slopes.length > 0
      });
    } else if (savedExpandedState !== null) {
      setExpandedCategories(savedExpandedState);
      setSavedExpandedState(null);
    }
  }, [searchQuery, filteredBricks.bricks.length, filteredBricks.plates.length, filteredBricks.tiles.length, filteredBricks.slopes.length]);

  const handleBrickClick = (brick: BrickType) => {
    setSelectedBrickType(selectedBrickType?.id === brick.id ? null : brick);
  };

  return (
    <div
      className="fixed top-0 left-0 h-full z-40 transition-transform duration-300 flex"
      style={{
        width: `${PANEL_WIDTH + 56}px`,
        transform: isOpen ? 'translateX(0)' : `translateX(-${PANEL_WIDTH}px)`
      }}
    >
      {/* Side Panel */}
      <div
        className="h-full bg-gray-800/95 backdrop-blur-sm shadow-xl flex-shrink-0"
        style={{ width: `${PANEL_WIDTH}px` }}
      >
        <div className="h-full py-4 px-4 flex flex-col gap-4 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}brick.png`} alt="Studli Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold text-white">Studli</h1>
              <p className="text-sm text-gray-400">{placedBricks.length} bricks placed</p>
            </div>
          </div>

          {/* Selection Info */}
          {selectedBrickIds.size > 0 && (
            <div className="bg-blue-600/30 border border-blue-500 rounded-lg p-2 text-sm text-blue-300">
              {selectedBrickIds.size} brick{selectedBrickIds.size !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* Mode Info */}
          {(mode === 'move' || mode === 'paste') && (
            <div className="bg-yellow-600/30 border border-yellow-500 rounded-lg p-2 text-sm text-yellow-300">
              {mode === 'move' ? 'Moving bricks...' : 'Pasting bricks...'}
              <div className="text-xs mt-1 opacity-80">Left click to place, right click to cancel</div>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bricks..."
              className="w-full pl-10 pr-10 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-sm placeholder-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Sections */}
          {(Object.keys(CATEGORY_CONFIG) as CategoryKey[]).map(key => (
            <CategorySection
              key={key}
              title={CATEGORY_CONFIG[key].title}
              description={CATEGORY_CONFIG[key].description}
              bricks={filteredBricks[key]}
              isExpanded={expandedCategories[key]}
              onToggle={() => toggleCategory(key)}
              selectedBrickType={selectedBrickType}
              onBrickClick={handleBrickClick}
              previewColor={selectedColor}
            />
          ))}

          {/* Color Palette */}
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-2">Color</h2>
            <ColorPicker />
          </div>

          {/* Layer Indicator */}
          {layerOffset !== 0 && mode === 'build' && (
            <div className="bg-yellow-600/20 border border-yellow-600 rounded-lg p-3">
              <div className="text-yellow-400 text-sm font-medium">
                Layer Offset: {layerOffset}
              </div>
              <button
                onClick={resetLayerOffset}
                className="text-xs text-yellow-300 hover:text-yellow-100 mt-1"
              >
                Reset to auto
              </button>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer */}
          <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-700">
            Click brick type to build • Click again to edit
          </div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mt-4 ml-4 p-3 h-fit bg-gray-800 rounded-xl shadow-lg text-white hover:bg-gray-700 transition-colors flex-shrink-0"
        title={isOpen ? 'Close panel' : 'Open panel'}
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>
    </div>
  );
};
