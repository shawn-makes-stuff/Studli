import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useBrickStore } from '../store/useBrickStore';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

type Dir = 'up' | 'down' | 'left' | 'right';

const getLayout = () => {
  if (typeof window === 'undefined') {
    return { button: 44, iconSize: 'medium' as const, gap: 8, pad: 10, ascendSizeClass: 'w-11 h-11', ascendIcon: 'medium' as const };
  }
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  const isTablet = minDim >= 700;
  return isTablet
    ? { button: 60, iconSize: 'large' as const, gap: 10, pad: 12, ascendSizeClass: 'w-14 h-14', ascendIcon: 'large' as const }
    : { button: 44, iconSize: 'medium' as const, gap: 8, pad: 10, ascendSizeClass: 'w-11 h-11', ascendIcon: 'medium' as const };
};

export const VirtualDPad = () => {
  const setVirtualJoystickInput = useBrickStore((state) => state.setVirtualJoystickInput);
  const setVirtualAscend = useBrickStore((state) => state.setVirtualAscend);
  const uiControlsDisabled = useBrickStore((state) => state.uiControlsDisabled);

  const [layout, setLayout] = useState(getLayout);
  const pressedByPointerId = useRef(new Map<number, Dir>());
  const [pressed, setPressed] = useState<Record<Dir, boolean>>({ up: false, down: false, left: false, right: false });

  useEffect(() => {
    const update = () => setLayout(getLayout());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  const computeVector = (next: Record<Dir, boolean>) => {
    const x = (next.right ? 1 : 0) + (next.left ? -1 : 0);
    const y = (next.up ? -1 : 0) + (next.down ? 1 : 0);
    return { x, y };
  };

  useEffect(() => {
    if (uiControlsDisabled) {
      pressedByPointerId.current.clear();
      setPressed({ up: false, down: false, left: false, right: false });
      setVirtualJoystickInput(null);
      setVirtualAscend(false);
    }
  }, [setVirtualAscend, setVirtualJoystickInput, uiControlsDisabled]);

  const applyPressed = (next: Record<Dir, boolean>) => {
    setPressed(next);
    const v = computeVector(next);
    if (v.x === 0 && v.y === 0) setVirtualJoystickInput(null);
    else setVirtualJoystickInput({ x: v.x, y: v.y });
  };

  const handleDirDown = (dir: Dir) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (uiControlsDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    pressedByPointerId.current.set(e.pointerId, dir);
    applyPressed({ ...pressed, [dir]: true });
  };

  const handleDirUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const dir = pressedByPointerId.current.get(e.pointerId);
    if (!dir) return;
    pressedByPointerId.current.delete(e.pointerId);

    // Recompute from remaining pointers
    const next: Record<Dir, boolean> = { up: false, down: false, left: false, right: false };
    for (const d of pressedByPointerId.current.values()) next[d] = true;
    applyPressed(next);
  };

  const handleAscendDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (uiControlsDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setVirtualAscend(true);
  };

  const handleAscendUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setVirtualAscend(false);
  };

  const buttonClass = useMemo(() => {
    return `pointer-events-auto rounded-lg bg-gray-800/70 border-2 border-gray-600 text-white shadow-lg flex items-center justify-center touch-manipulation ${
      uiControlsDisabled ? 'cursor-not-allowed opacity-50' : 'active:scale-95'
    }`;
  }, [uiControlsDisabled]);

  return (
    <div
      className={`fixed ui-safe-left z-20 pointer-events-none select-none flex flex-col items-start ${uiControlsDisabled ? 'opacity-40' : ''}`}
      style={{ bottom: 'calc(5rem + var(--app-bottom-inset, 0px))' }}
    >
      <button
        onPointerDown={handleAscendDown}
        onPointerUp={handleAscendUp}
        onPointerCancel={handleAscendUp}
        disabled={uiControlsDisabled}
        className={`pointer-events-auto mb-2 ${layout.ascendSizeClass} rounded-full bg-gray-800/70 border-2 border-gray-600 text-white shadow-lg flex items-center justify-center touch-manipulation ${
          uiControlsDisabled ? 'cursor-not-allowed' : 'active:scale-95'
        }`}
        title="Ascend"
      >
        <KeyboardArrowUpIcon fontSize={layout.ascendIcon} />
      </button>

      <div
        className={`pointer-events-none`}
        style={{
          width: layout.button * 3 + layout.gap * 2 + layout.pad * 2,
          height: layout.button * 3 + layout.gap * 2 + layout.pad * 2,
          padding: layout.pad,
        }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${layout.button}px ${layout.button}px ${layout.button}px`,
            gridTemplateRows: `${layout.button}px ${layout.button}px ${layout.button}px`,
            gap: `${layout.gap}px`,
          }}
        >
          <div />
          <button
            onPointerDown={handleDirDown('up')}
            onPointerUp={handleDirUp}
            onPointerCancel={handleDirUp}
            onPointerLeave={handleDirUp}
            disabled={uiControlsDisabled}
            className={buttonClass}
            style={{ width: layout.button, height: layout.button }}
            title="Up"
          >
            <KeyboardArrowUpIcon fontSize={layout.iconSize} />
          </button>
          <div />

          <button
            onPointerDown={handleDirDown('left')}
            onPointerUp={handleDirUp}
            onPointerCancel={handleDirUp}
            onPointerLeave={handleDirUp}
            disabled={uiControlsDisabled}
            className={buttonClass}
            style={{ width: layout.button, height: layout.button }}
            title="Left"
          >
            <KeyboardArrowLeftIcon fontSize={layout.iconSize} />
          </button>
          <div className="rounded-lg bg-gray-700/40 border border-gray-600/50" />
          <button
            onPointerDown={handleDirDown('right')}
            onPointerUp={handleDirUp}
            onPointerCancel={handleDirUp}
            onPointerLeave={handleDirUp}
            disabled={uiControlsDisabled}
            className={buttonClass}
            style={{ width: layout.button, height: layout.button }}
            title="Right"
          >
            <KeyboardArrowRightIcon fontSize={layout.iconSize} />
          </button>

          <div />
          <button
            onPointerDown={handleDirDown('down')}
            onPointerUp={handleDirUp}
            onPointerCancel={handleDirUp}
            onPointerLeave={handleDirUp}
            disabled={uiControlsDisabled}
            className={buttonClass}
            style={{ width: layout.button, height: layout.button }}
            title="Down"
          >
            <KeyboardArrowDownIcon fontSize={layout.iconSize} />
          </button>
          <div />
        </div>
      </div>
    </div>
  );
};

