import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { BRICK_TYPES, BrickType, BrickVariant } from '../types/brick';
import { BrickThumbnail } from './BrickThumbnail';
import { SearchIcon, CloseIcon } from './Icons';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { playSfx } from '../utils/sfx';
import { loadBrickSpriteSheet } from '../utils/brickSpriteSheet';

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

const STORAGE_KEY = 'brickPickerPopout';

const loadSavedState = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const pos = parsed?.position ?? {};
    const sz = parsed?.size ?? {};
    return {
      isPinned: Boolean(parsed?.isPinned),
      position: {
        x: Number.isFinite(pos.x) ? pos.x : 0,
        y: Number.isFinite(pos.y) ? pos.y : 0
      },
      size: {
        width: Number.isFinite(sz.width) ? sz.width : 600,
        height: Number.isFinite(sz.height) ? sz.height : 600
      }
    };
  } catch {
    return null;
  }
};

export const BrickPickerPopout = ({ isOpen, onClose, currentBrick, onBrickSelect, anchorRef }: BrickPickerPopoutProps) => {
  const savedStateRef = useRef(loadSavedState());
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [loadedBricks, setLoadedBricks] = useState<Set<string>>(new Set());
  const [isPinned, setIsPinned] = useState<boolean>(savedStateRef.current?.isPinned ?? false);
  const [position, setPosition] = useState<{ x: number; y: number }>(savedStateRef.current?.position ?? { x: 0, y: 0 });
  const [size, setSize] = useState(savedStateRef.current?.size ?? { width: 600, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const popoutRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0, startX: 0, startY: 0 });
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

  // Persist pin + position + size
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ isPinned, position, size }));
  }, [isPinned, position, size]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    } else if (!hasBeenOpened) {
      // First time opening - render thumbnails and progressively mark as loaded
      setHasBeenOpened(true);
      setLoadedBricks(new Set());

      const brickIds = BRICK_TYPES.map(b => b.id);

      // If a spritesheet exists, mark all as loaded immediately (fast thumbnails).
      loadBrickSpriteSheet().then((sheet) => {
        if (sheet) {
          setLoadedBricks(new Set(brickIds));
          return;
        }

        // Otherwise, progressively mark bricks as loaded with a stagger effect.
        brickIds.forEach((id, index) => {
          setTimeout(() => {
            setLoadedBricks(prev => new Set([...prev, id]));
          }, index * 15); // 15ms stagger per brick
        });
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
        playSfx('click');
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
        const { mouseX, mouseY, width, height, startX, startY } = resizeStartRef.current;
        const deltaX = e.clientX - mouseX;
        const deltaY = e.clientY - mouseY;
        const nextWidth = Math.max(400, width - deltaX);
        const nextHeight = Math.max(400, height - deltaY);
        const nextX = startX + (width - nextWidth);
        const nextY = startY + (height - nextHeight);
        pendingSizeRef.current = { width: nextWidth, height: nextHeight };
        pendingPositionRef.current = { x: nextX, y: nextY };
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
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const isMobileLayout = viewportWidth < 640 || viewportHeight < 520;
    if (isMobileLayout || isPinned) return;
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
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const isMobileLayout = viewportWidth < 640 || viewportHeight < 520;
    if (isMobileLayout || isPinned) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    const rect = popoutRef.current?.getBoundingClientRect();
    const width = rect ? rect.width : size.width;
    const height = rect ? rect.height : size.height;
    const startX = rect ? rect.left : position.x;
    const startY = rect ? rect.top : position.y;
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width,
      height,
      startX,
      startY
    };
    pendingSizeRef.current = { width, height };
    pendingPositionRef.current = { x: startX, y: startY };
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
    playSfx('click');
    onBrickSelect(brick);
    // Only close if not pinned
    if (!isPinned) {
      onClose();
    }
  };

  const currentPosition = isDragging ? livePositionRef.current : position;
  const currentSize = isResizing ? liveSizeRef.current : size;
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const isCoarsePointer = typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)')?.matches);
  const useWindowLayout = isCoarsePointer;
  const isMobileLayout = viewportWidth < 640 || viewportHeight < 520;
  const isTinyScreen = isMobileLayout && (viewportWidth < 360 || viewportHeight < 420);
  const thumbnailSize = isTinyScreen ? 50 : 60;

  if (useWindowLayout) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-[60] pointer-events-auto bg-gray-950">
        <div
          className="absolute inset-0 flex flex-col"
          style={{
            paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <div className="text-white font-semibold">Bricks</div>
            <button
              onClick={() => {
                playSfx('click');
                onClose();
              }}
              className="text-gray-300 hover:text-white p-2 -m-2 touch-manipulation"
              aria-label="Close brick picker"
              title="Close"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="px-3 py-2 border-b border-gray-800">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bricks..."
                className="w-full pl-10 pr-3 py-2 bg-gray-900 text-white rounded-lg border border-gray-800 focus:border-blue-500 focus:outline-none text-sm placeholder-gray-500"
              />
            </div>
          </div>

          <div className="px-3 py-2 border-b border-gray-800 overflow-x-auto">
            <div className="flex gap-2">
              {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    playSfx('click');
                    setSelectedCategory(key);
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition whitespace-nowrap touch-manipulation ${
                    selectedCategory === key
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-900 border-gray-800 text-gray-200 hover:bg-gray-800'
                  }`}
                >
                  {CATEGORIES[key].title}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {filteredBricks.length > 0 ? (
                filteredBricks.map((brick) => {
                  const isLoaded = loadedBricks.has(brick.id) || hasBeenOpened;
                  return (
                    <button
                      key={brick.id}
                      onClick={() => handleBrickSelect(brick)}
                      className={`
                        p-2 rounded-lg border-2 transition-all touch-manipulation
                        ${currentBrick?.id === brick.id
                          ? 'border-blue-500 bg-blue-600/20'
                          : 'border-gray-800 hover:border-gray-600 bg-gray-900/60'
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
                              <div className="absolute inset-0 border-2 border-gray-700 rounded-full"></div>
                              <div className="absolute inset-0 border-2 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                            </div>
                          </div>
                        )}
                        <div className={isLoaded ? 'opacity-100' : 'opacity-0'}>
                          <BrickThumbnail brickType={brick} color={brick.color} size={thumbnailSize} />
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-300 text-center truncate">
                        {isLoaded ? brick.name : <div className="h-3 bg-gray-700 rounded animate-pulse"></div>}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full text-center text-gray-500 py-8">No bricks found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={popoutRef}
      className={`fixed bg-gray-800/98 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-600 z-50 flex flex-col transition-opacity duration-150 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${isMobileLayout ? (isTinyScreen ? 'left-2 right-2 top-2 bottom-20' : 'left-4 right-4 top-4 bottom-20') : ''}`}
      style={
        !isMobileLayout
          ? {
              width: `${currentSize.width}px`,
              height: `${currentSize.height}px`,
              left: currentPosition.x === 0 ? '50%' : `${currentPosition.x}px`,
              top: currentPosition.y === 0 ? '50%' : `${currentPosition.y}px`,
              transform: currentPosition.x === 0 && currentPosition.y === 0 ? 'translate(-50%, -50%)' : 'none',
              cursor: isDragging ? 'grabbing' : isPinned ? 'default' : 'auto',
              transition: isDragging || isResizing ? 'opacity 150ms ease' : undefined
            }
          : undefined
      }
    >
      {/* Header (desktop only) */}
      {!isMobileLayout && (
        <div
          className={`flex items-center justify-between ${isTinyScreen ? 'p-3' : 'p-4'} border-b border-gray-700 flex-shrink-0 select-none ${!isPinned ? 'cursor-grab active:cursor-grabbing' : ''}`}
          onMouseDown={handleDragStart}
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <h3 className="text-white font-semibold select-none">Select Brick</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                playSfx('click');
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                playSfx('click');
                onClose();
              }}
              className="text-gray-400 hover:text-white p-1 -m-1 touch-manipulation"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className={`${isTinyScreen ? 'p-2' : 'p-3'} border-b border-gray-700 flex-shrink-0`}>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bricks..."
            className={`w-full pl-10 pr-3 ${isTinyScreen ? 'py-1.5' : 'py-2'} bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-sm placeholder-gray-400`}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className={`flex gap-1 ${isTinyScreen ? 'p-2' : 'p-3'} border-b border-gray-700 overflow-x-auto flex-shrink-0`}>
        {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => (
          <button
            key={key}
            onClick={() => {
              playSfx('click');
              setSelectedCategory(key);
            }}
            className={`
              ${isTinyScreen ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} rounded-lg font-medium transition-colors whitespace-nowrap touch-manipulation
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
      <div className={`flex-1 ${isTinyScreen ? 'p-2 overflow-hidden' : 'p-3 overflow-y-auto'}`}>
        {isTinyScreen ? (
          <div className="overflow-x-auto overflow-y-hidden">
            <div className="flex gap-2">
              {!hasBeenOpened ? (
                Array.from({ length: 10 }).map((_, index) => (
                  <div
                    key={`loading-row-${index}`}
                    className="flex-shrink-0 w-24 p-2 rounded-lg border-2 border-gray-600 bg-gray-700/50"
                  >
                    <div className="aspect-square flex items-center justify-center mb-1">
                      <div className="relative w-8 h-8">
                        <div className="absolute inset-0 border-2 border-gray-600 rounded-full"></div>
                        <div className="absolute inset-0 border-2 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-600 rounded animate-pulse"></div>
                  </div>
                ))
              ) : filteredBricks.length > 0 ? (
                filteredBricks.map((brick) => {
                  const isLoaded = loadedBricks.has(brick.id);
                  return (
                    <button
                      key={brick.id}
                      onClick={() => handleBrickSelect(brick)}
                      className={`
                        flex-shrink-0 w-24 p-2 rounded-lg border-2 transition-all touch-manipulation
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
                          <BrickThumbnail brickType={brick} color={brick.color} size={thumbnailSize} />
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-300 text-center truncate">
                        {isLoaded ? brick.name : <div className="h-3 bg-gray-600 rounded animate-pulse"></div>}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-6 w-full">No bricks found</div>
              )}
            </div>
          </div>
        ) : (
          <div className={`grid grid-cols-3 sm:grid-cols-6 gap-2`}>
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
        )}
      </div>

      {/* Resize Handle - Desktop only */}
      {!isMobileLayout && (
        <div
          onMouseDown={handleResizeStart}
          className={`absolute top-1 left-1 w-6 h-6 group ${isPinned ? 'hidden' : 'cursor-nw-resize'}`}
          style={{ touchAction: 'none' }}
        >
          <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-gray-500 group-hover:border-gray-300 transition-colors" />
        </div>
      )}
    </div>
  );
};
