import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useBrickStore } from '../store/useBrickStore';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const getJoystickLayout = () => {
  if (typeof window === 'undefined') {
    return { joystickSize: 100, knobSize: 40, buttonSizeClass: 'w-11 h-11', iconSize: 'medium' as const };
  }
  const minDim = Math.min(window.innerWidth, window.innerHeight);
  const isTablet = minDim >= 700;
  return isTablet
    ? { joystickSize: 140, knobSize: 56, buttonSizeClass: 'w-14 h-14', iconSize: 'large' as const }
    : { joystickSize: 100, knobSize: 40, buttonSizeClass: 'w-11 h-11', iconSize: 'medium' as const };
};

export const VirtualJoystick = () => {
  const setVirtualJoystickInput = useBrickStore((state) => state.setVirtualJoystickInput);
  const setVirtualAscend = useBrickStore((state) => state.setVirtualAscend);
  const uiControlsDisabled = useBrickStore((state) => state.uiControlsDisabled);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [layout, setLayout] = useState(getJoystickLayout);
  const activePointerIdRef = useRef<number | null>(null);
  const baseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setLayout(getJoystickLayout());
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

  useEffect(() => {
    if (uiControlsDisabled) {
      activePointerIdRef.current = null;
      setIsDragging(false);
      setPosition({ x: 0, y: 0 });
      setVirtualJoystickInput(null);
      setVirtualAscend(false);
    }
  }, [layout.joystickSize, layout.knobSize, setVirtualAscend, setVirtualJoystickInput, uiControlsDisabled]);

  const MAX_DISTANCE = (layout.joystickSize - layout.knobSize) / 2;

  const updatePosition = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;

    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > MAX_DISTANCE) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * MAX_DISTANCE;
      dy = Math.sin(angle) * MAX_DISTANCE;
    }

    setPosition({ x: dx, y: dy });

    const normalizedX = dx / MAX_DISTANCE;
    const normalizedY = dy / MAX_DISTANCE;
    setVirtualJoystickInput({ x: normalizedX, y: normalizedY });
  };

  const reset = () => {
    activePointerIdRef.current = null;
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    setVirtualJoystickInput(null);
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (uiControlsDisabled) return;
    if (activePointerIdRef.current !== null) return;
    if (!baseRef.current) return;

    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > layout.joystickSize / 2) return;

    e.preventDefault();
    e.stopPropagation();
    activePointerIdRef.current = e.pointerId;
    baseRef.current.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (uiControlsDisabled) return;
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updatePosition(e.clientX, e.clientY);
  };

  const handlePointerUpOrCancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    reset();
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
        className={`pointer-events-auto mb-2 ${layout.buttonSizeClass} rounded-full bg-gray-800/70 border-2 border-gray-600 text-white shadow-lg flex items-center justify-center touch-manipulation ${uiControlsDisabled ? 'cursor-not-allowed' : 'active:scale-95'}`}
        title="Ascend"
      >
        <KeyboardArrowUpIcon fontSize={layout.iconSize} />
      </button>

      <div
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        className={`relative ${uiControlsDisabled ? 'pointer-events-none' : 'pointer-events-auto'}`}
        style={{
          width: `${layout.joystickSize}px`,
          height: `${layout.joystickSize}px`,
          touchAction: 'none',
        }}
      >
        {/* Base circle */}
        <div
          className="absolute inset-0 rounded-full bg-gray-700/50 border-2 border-gray-500/50"
          style={{
            width: `${layout.joystickSize}px`,
            height: `${layout.joystickSize}px`,
          }}
        />

        {/* Knob */}
        <div
          className={`absolute rounded-full transition-all ${
            isDragging ? 'bg-blue-500/80 scale-110' : 'bg-blue-400/60'
          }`}
          style={{
            width: `${layout.knobSize}px`,
            height: `${layout.knobSize}px`,
            left: `${layout.joystickSize / 2 - layout.knobSize / 2 + position.x}px`,
            top: `${layout.joystickSize / 2 - layout.knobSize / 2 + position.y}px`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        />
      </div>
    </div>
  );
};
