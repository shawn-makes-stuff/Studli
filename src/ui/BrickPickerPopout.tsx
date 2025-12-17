import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { BRICK_TYPES, BrickType, BrickVariant } from '../types/brick';
import { BrickThumbnail } from './BrickThumbnail';
import { SearchIcon, CloseIcon } from './Icons';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';

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
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [loadedBricks, setLoadedBricks] = useState<Set<string>>(new Set());
  const [isPinned, setIsPinned] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 600, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const popoutRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });
  const frameRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<{ x: number; y: number } | null>(null);
  const pendingSizeRef = useRef<{ width: number; height: number } | null>(null);
  const livePositionRef = useRef(position);
  const liveSizeRef = useRef(size);

  useEffect(() => {
    livePositionRef.current = position;
  }, [position]);

  useEffect(() => {
    liveSizeRef.current = size;
  }, [size]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    } else if (!hasBeenOpened) {
      // First time opening - render thumbnails and progressively mark as loaded
      setHasBeenOpened(true);
      setLoadedBricks(new Set());

      // Progressively mark bricks as loaded with a stagger effect
      const brickIds = BRICK_TYPES.map(b => b.id);
      brickIds.forEach((id, index) => {
        setTimeout(() => {
          setLoadedBricks(prev => new Set([...prev, id]));
        }, index * 15); // 15ms stagger per brick
      });
    }
  }, [isOpen, hasBeenOpened]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        !isPinned &&
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
  }, [isOpen, onClose, anchorRef, isPinned]);

  // Throttle position/size updates to the next animation frame and apply directly to the element for snappier drag/resize
  const requestFrame = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      const el = popoutRef.current;
      if (el) {
        if (pendingPositionRef.current) {
          const { x, y } = pendingPositionRef.current;
          livePositionRef.current = { x, y };
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          el.style.transform = 'translate3d(0, 0, 0)';
          pendingPositionRef.current = null;
        }
        if (pendingSizeRef.current) {
          const { width, height } = pendingSizeRef.current;
          liveSizeRef.current = { width, height };
          el.style.width = `${width}px`;
          el.style.height = `${height}px`;
          pendingSizeRef.current = null;
        }
      }
      frameRef.current = null;
    });
  }, []);

  // Drag and resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const { mouseX, mouseY, startX, startY } = dragStartRef.current;
        pendingPositionRef.current = {
          x: startX + (e.clientX - mouseX),
          y: startY + (e.clientY - mouseY)
        };
        requestFrame();
      } else if (isResizing) {
        const { mouseX, mouseY, width, height } = resizeStartRef.current;
        pendingSizeRef.current = {
          width: Math.max(400, width + (e.clientX - mouseX)),
          height: Math.max(400, height + (e.clientY - mouseY))
        };
        requestFrame();
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      const finalPosition = pendingPositionRef.current ?? livePositionRef.current;
      const finalSize = pendingSizeRef.current ?? liveSizeRef.current;
      livePositionRef.current = finalPosition;
      liveSizeRef.current = finalSize;
      if (pendingPositionRef.current || pendingSizeRef.current) {
        requestFrame();
      }
      // Commit the final position/size back to React state after the drag/resize finishes
      setPosition(finalPosition);
      setSize(finalSize);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, requestFrame]);

  useEffect(() => () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }
  }, []);


  const handleDragStart = (e: React.MouseEvent) => {
    // Only allow dragging on desktop
    if (window.innerWidth < 640 || isPinned) return;
    // Prevent event from propagating to the 3D scene
    e.preventDefault();
    e.stopPropagation();
    const rect = popoutRef.current?.getBoundingClientRect();
    const startX = rect ? rect.left : position.x;
    const startY = rect ? rect.top : position.y;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX,
      startY
    };
    // Align immediately so movement tracks the cursor without a frame of lag
    pendingPositionRef.current = { x: startX, y: startY };
    requestFrame();
    setIsDragging(true);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    // Only allow resizing on desktop
    if (window.innerWidth < 640 || isPinned) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    const rect = popoutRef.current?.getBoundingClientRect();
    const width = rect ? rect.width : size.width;
    const height = rect ? rect.height : size.height;
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width,
      height
    };
    pendingSizeRef.current = { width, height };
    requestFrame();
  };

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

  const handleBrickSelect = (brick: BrickType) => {
    onBrickSelect(brick);
    // Only close if not pinned
    if (!isPinned) {
      onClose();
    }
  };

  const currentPosition = isDragging ? livePositionRef.current : position;
  const currentSize = isResizing ? liveSizeRef.current : size;

  return (
    <div
      ref={popoutRef}
      className={`fixed bg-gray-800/98 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-600 z-50 flex flex-col transition-opacity duration-150 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${window.innerWidth >= 640 ? '' : 'inset-x-4 bottom-20 max-h-[70vh]'}`}
      style={
        window.innerWidth >= 640
          ? {
              width: `${currentSize.width}px`,
              height: `${currentSize.height}px`,
              left: currentPosition.x === 0 ? '50%' : `${currentPosition.x}px`,
              top: currentPosition.y === 0 ? '50%' : `${currentPosition.y}px`,
              transform: currentPosition.x === 0 && currentPosition.y === 0 ? 'translate(-50%, -50%)' : 'none',
              cursor: isDragging ? 'grabbing' : isPinned ? 'default' : 'auto',
              transition: isDragging || isResizing ? 'opacity 150ms ease' : undefined
            }
          : {
              width: 'calc(100vw - 2rem)',
              maxWidth: '600px'
            }
      }
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0 select-none ${window.innerWidth >= 640 && !isPinned ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onMouseDown={handleDragStart}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <h3 className="text-white font-semibold select-none">Select Brick</h3>
        <div className="flex items-center gap-2">
          {window.innerWidth >= 640 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPinned(!isPinned);
              }}
              className={`p-1 -m-1 touch-manipulation transition-colors ${isPinned ? 'text-blue-400 hover:text-blue-300' : 'text-gray-400 hover:text-white'}`}
              title={isPinned ? 'Unpin window' : 'Pin window'}
            >
              {isPinned ? (
                <PushPinIcon className="w-5 h-5" />
              ) : (
                <PushPinOutlinedIcon className="w-5 h-5" />
              )}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-gray-400 hover:text-white p-1 -m-1 touch-manipulation"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
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
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {!hasBeenOpened ? (
            // Initial loading placeholders
            Array.from({ length: 18 }).map((_, index) => (
              <div
                key={`loading-${index}`}
                className="p-2 rounded-lg border-2 border-gray-600 bg-gray-700/50"
              >
                <div className="aspect-square flex items-center justify-center mb-1">
                  <div className="relative w-8 h-8">
                    <div className="absolute inset-0 border-2 border-gray-600 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-600 rounded animate-pulse"></div>
              </div>
            ))
          ) : filteredBricks.length > 0 ? (
            // Show bricks with individual loading states
            filteredBricks.map((brick) => {
              const isLoaded = loadedBricks.has(brick.id);
              return (
                <button
                  key={brick.id}
                  onClick={() => handleBrickSelect(brick)}
                  className={`
                    p-2 rounded-lg border-2 transition-all touch-manipulation
                    ${currentBrick?.id === brick.id
                      ? 'border-blue-500 bg-blue-600/20'
                      : 'border-gray-600 hover:border-gray-400 bg-gray-700/50'
                    }
                    ${isLoaded ? 'active:scale-95' : ''}
                  `}
                  title={brick.name}
                  disabled={!isLoaded}
                >
                  <div className="aspect-square flex items-center justify-center mb-1 relative">
                    {!isLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-8 h-8">
                          <div className="absolute inset-0 border-2 border-gray-600 rounded-full"></div>
                          <div className="absolute inset-0 border-2 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                      </div>
                    )}
                    <div className={isLoaded ? 'opacity-100' : 'opacity-0'}>
                      <BrickThumbnail brickType={brick} color={brick.color} size={60} />
                    </div>
                  </div>
                  <div className="text-xs text-gray-300 text-center truncate">
                    {isLoaded ? brick.name : <div className="h-4 bg-gray-600 rounded animate-pulse"></div>}
                  </div>
                </button>
              );
            })
          ) : (
            // No bricks found
            <div className="col-span-full text-center text-gray-500 py-8">
              No bricks found
            </div>
          )}
        </div>
      </div>

      {/* Resize Handle - Desktop only */}
      {window.innerWidth >= 640 && (
        <div
          onMouseDown={handleResizeStart}
          className={`absolute top-0 left-0 w-6 h-6 group ${isPinned ? 'hidden' : 'cursor-nw-resize'}`}
          style={{ touchAction: 'none' }}
        >
          <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-gray-500 group-hover:border-gray-300 transition-colors" />
        </div>
      )}
    </div>
  );
};
