import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useBrickStore } from '../store/useBrickStore';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const JOYSTICK_SIZE = 100;
const KNOB_SIZE = 40;
const MAX_DISTANCE = (JOYSTICK_SIZE - KNOB_SIZE) / 2;

export const VirtualJoystick = () => {
  const setVirtualJoystickInput = useBrickStore((state) => state.setVirtualJoystickInput);
  const setVirtualAscend = useBrickStore((state) => state.setVirtualAscend);
  const uiControlsDisabled = useBrickStore((state) => state.uiControlsDisabled);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  const baseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (uiControlsDisabled) {
      touchIdRef.current = null;
      setIsDragging(false);
      setPosition({ x: 0, y: 0 });
      setVirtualJoystickInput(null);
      setVirtualAscend(false);
      return;
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (touchIdRef.current !== null) return;
      if (!baseRef.current) return;
      const rect = baseRef.current.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      // Find the touch that started within the joystick base (supports multi-touch).
      for (const touch of Array.from(e.changedTouches)) {
        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= JOYSTICK_SIZE / 2) {
          touchIdRef.current = touch.identifier;
          setIsDragging(true);
          updatePosition(touch.clientX, touch.clientY);
          break;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (touchIdRef.current === null) return;

      const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current);
      if (!touch) return;

      e.preventDefault();
      updatePosition(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = Array.from(e.changedTouches).find(t => t.identifier === touchIdRef.current);
      if (!touch) return;

      touchIdRef.current = null;
      setIsDragging(false);
      setPosition({ x: 0, y: 0 });
      setVirtualJoystickInput(null);
    };

    const updatePosition = (clientX: number, clientY: number) => {
      if (!baseRef.current) return;

      const rect = baseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Clamp to max distance
      if (distance > MAX_DISTANCE) {
        const angle = Math.atan2(dy, dx);
        dx = Math.cos(angle) * MAX_DISTANCE;
        dy = Math.sin(angle) * MAX_DISTANCE;
      }

      setPosition({ x: dx, y: dy });

      // Normalize and send to store
      const normalizedX = dx / MAX_DISTANCE;
      const normalizedY = dy / MAX_DISTANCE;
      setVirtualJoystickInput({ x: normalizedX, y: normalizedY });
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [setVirtualAscend, setVirtualJoystickInput, uiControlsDisabled]);

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
      className={`fixed bottom-20 ui-safe-left z-20 pointer-events-none select-none flex flex-col items-start ${uiControlsDisabled ? 'opacity-40' : ''}`}
    >
      <button
        onPointerDown={handleAscendDown}
        onPointerUp={handleAscendUp}
        onPointerCancel={handleAscendUp}
        disabled={uiControlsDisabled}
        className={`pointer-events-auto mb-2 w-11 h-11 rounded-full bg-gray-800/70 border-2 border-gray-600 text-white shadow-lg flex items-center justify-center touch-manipulation ${uiControlsDisabled ? 'cursor-not-allowed' : 'active:scale-95'}`}
        title="Ascend"
      >
        <KeyboardArrowUpIcon fontSize="medium" />
      </button>

      <div
        ref={baseRef}
        className={`relative ${uiControlsDisabled ? 'pointer-events-none' : 'pointer-events-auto'}`}
        style={{
          width: `${JOYSTICK_SIZE}px`,
          height: `${JOYSTICK_SIZE}px`,
        }}
      >
        {/* Base circle */}
        <div
          className="absolute inset-0 rounded-full bg-gray-700/50 border-2 border-gray-500/50"
          style={{
            width: `${JOYSTICK_SIZE}px`,
            height: `${JOYSTICK_SIZE}px`,
          }}
        />

        {/* Knob */}
        <div
          className={`absolute rounded-full transition-all ${
            isDragging ? 'bg-blue-500/80 scale-110' : 'bg-blue-400/60'
          }`}
          style={{
            width: `${KNOB_SIZE}px`,
            height: `${KNOB_SIZE}px`,
            left: `${JOYSTICK_SIZE / 2 - KNOB_SIZE / 2 + position.x}px`,
            top: `${JOYSTICK_SIZE / 2 - KNOB_SIZE / 2 + position.y}px`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        />
      </div>
    </div>
  );
};
