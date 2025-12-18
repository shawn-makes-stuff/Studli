import { useEffect, useMemo, useState } from 'react';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CloseIcon from '@mui/icons-material/Close';
import { useBrickStore } from '../store/useBrickStore';

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

type ControlsHelpProps = {
  isMobile: boolean;
  hidden?: boolean;
};

export const ControlsHelp = ({ isMobile, hidden }: ControlsHelpProps) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(readPointerLocked);
  const [isHintDismissed, setIsHintDismissed] = useState(readDismissed);
  const uiControlsDisabled = useBrickStore((state) => state.uiControlsDisabled);

  useEffect(() => {
    const onPointerLockChange = () => setIsPointerLocked(readPointerLocked());
    document.addEventListener('pointerlockchange', onPointerLockChange);
    return () => document.removeEventListener('pointerlockchange', onPointerLockChange);
  }, []);

  useEffect(() => {
    if (uiControlsDisabled && isHelpOpen) {
      setIsHelpOpen(false);
    }
  }, [isHelpOpen, uiControlsDisabled]);

  const showDesktopHint = useMemo(() => {
    if (hidden) return false;
    if (isMobile) return false;
    if (isPointerLocked) return false;
    if (isHintDismissed) return false;
    return true;
  }, [hidden, isHintDismissed, isMobile, isPointerLocked]);

  const showHelpButton = useMemo(() => {
    if (hidden) return false;
    if (uiControlsDisabled) return false;
    if (isMobile) return true;
    return !isPointerLocked;
  }, [hidden, isMobile, isPointerLocked, uiControlsDisabled]);

  const dismissHint = () => {
    setIsHintDismissed(true);
    writeDismissed(true);
  };

  return (
    <>
      {showDesktopHint && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <div className="max-w-[92vw] flex items-start gap-2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 shadow-lg">
            <div className="text-[11px] sm:text-xs text-gray-100 leading-snug">
              <div>
                Press <span className="font-semibold">Esc</span> to enter build mode (press again to exit).
              </div>
              <div>WASD to move • Mouse to look • Click to place</div>
            </div>
            <button
              onClick={dismissHint}
              className="text-gray-300 hover:text-white -mt-0.5 p-1 -m-1"
              aria-label="Dismiss hint"
              title="Dismiss"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
        </div>
      )}

      {showHelpButton && (
        <button
          onClick={() => setIsHelpOpen(true)}
          className="fixed top-3 right-3 z-50 pointer-events-auto w-10 h-10 rounded-full bg-gray-800 border border-gray-600 text-white shadow-lg hover:bg-gray-700 active:scale-95 transition flex items-center justify-center"
          aria-label="Help"
          title="Help"
        >
          <HelpOutlineIcon fontSize="small" />
        </button>
      )}

      {isHelpOpen && (
        <div className="fixed inset-0 z-[60] pointer-events-auto">
          <button
            className="absolute inset-0 bg-black/60"
            aria-label="Close help"
            onClick={() => setIsHelpOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-[92vw] max-w-md max-h-[85vh] overflow-y-auto rounded-xl bg-gray-900 border border-gray-700 shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <h2 className="text-white font-semibold">Controls</h2>
                <button
                  onClick={() => setIsHelpOpen(false)}
                  className="text-gray-300 hover:text-white p-1 -m-1"
                  aria-label="Close"
                  title="Close"
                >
                  <CloseIcon fontSize="small" />
                </button>
              </div>
              <div className="p-4 text-sm text-gray-100 space-y-3">
                {isMobile ? (
                  <>
                    <div className="font-semibold text-gray-200">Touch</div>
                    <ul className="list-disc pl-5 space-y-1 text-gray-200">
                      <li>Left joystick: move</li>
                      <li>Right joystick: look</li>
                      <li>Tap: place brick</li>
                      <li>Pinch: zoom</li>
                      <li>Up/Down buttons: ascend/descend</li>
                      <li>Bottom bar: rotate and undo</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <div className="font-semibold text-gray-200">Desktop</div>
                    <ul className="list-disc pl-5 space-y-1 text-gray-200">
                      <li>Esc: enter/exit build mode</li>
                      <li>WASD: move</li>
                      <li>Space / Ctrl: up / down</li>
                      <li>Mouse: look</li>
                      <li>Click: place brick</li>
                      <li>Mouse wheel: zoom</li>
                      <li>Shift: move faster</li>
                      <li>R: rotate preview</li>
                      <li>Ctrl/Cmd+Z: undo</li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
