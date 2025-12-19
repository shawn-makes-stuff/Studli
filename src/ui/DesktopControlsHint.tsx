import { useEffect, useMemo, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { playSfx } from '../utils/sfx';

const DISMISS_KEY = 'desktopControlsHintDismissed';

const readDismissed = () => {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

const writeDismissed = (dismissed: boolean) => {
  try {
    localStorage.setItem(DISMISS_KEY, dismissed ? '1' : '0');
  } catch {
    // ignore
  }
};

const readPointerLocked = () => {
  if (typeof document === 'undefined') return false;
  return document.pointerLockElement !== null;
};

type DesktopControlsHintProps = {
  hidden?: boolean;
};

export const DesktopControlsHint = ({ hidden }: DesktopControlsHintProps) => {
  const [isPointerLocked, setIsPointerLocked] = useState(readPointerLocked);
  const [isHintDismissed, setIsHintDismissed] = useState(readDismissed);

  useEffect(() => {
    const onPointerLockChange = () => setIsPointerLocked(readPointerLocked());
    document.addEventListener('pointerlockchange', onPointerLockChange);
    return () => document.removeEventListener('pointerlockchange', onPointerLockChange);
  }, []);

  const showHint = useMemo(() => {
    if (hidden) return false;
    if (isPointerLocked) return false;
    if (isHintDismissed) return false;
    return true;
  }, [hidden, isHintDismissed, isPointerLocked]);

  if (!showHint) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <div className="max-w-[92vw] flex items-start gap-2 bg-gray-800/95 border border-gray-600 rounded-lg px-3 py-2 shadow-lg backdrop-blur-sm">
        <div className="text-[11px] sm:text-xs text-gray-100 leading-snug">
          <div>
            Press <span className="font-semibold">Esc</span> to enter build mode (press again to exit).
          </div>
          <div className="text-gray-200">
            WASD to move · Mouse to look · Click to place · Wheel to zoom
          </div>
        </div>
        <button
          onClick={() => {
            playSfx('click');
            setIsHintDismissed(true);
            writeDismissed(true);
          }}
          className="text-gray-300 hover:text-white -mt-0.5 p-1 -m-1"
          aria-label="Dismiss hint"
          title="Dismiss"
        >
          <CloseIcon fontSize="small" />
        </button>
      </div>
    </div>
  );
};

