import AnchorIcon from '@mui/icons-material/Anchor';
import { useEffect, useMemo, useState } from 'react';
import { useBrickStore } from '../store/useBrickStore';
import { playSfx } from '../utils/sfx';
import { getConnectionPointCycle, getSelectedConnectionPoint } from '../utils/connectionPoints';

type ConnectionPointCycleButtonProps = {
  hidden?: boolean;
  hideWhenPointerLocked?: boolean;
};

const readPointerLocked = () => {
  if (typeof document === 'undefined') return false;
  return document.pointerLockElement !== null;
};

export const ConnectionPointCycleButton = ({ hidden, hideWhenPointerLocked }: ConnectionPointCycleButtonProps) => {
  const selectedBrickType = useBrickStore((state) => state.selectedBrickType);
  const connectionPointIndex = useBrickStore((state) => state.connectionPointIndex);
  const cycleConnectionPoint = useBrickStore((state) => state.cycleConnectionPoint);
  const [isPointerLocked, setIsPointerLocked] = useState(readPointerLocked);

  useEffect(() => {
    if (!hideWhenPointerLocked) return;
    const onChange = () => setIsPointerLocked(readPointerLocked());
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, [hideWhenPointerLocked]);

  const { disabled, isTop } = useMemo(() => {
    if (!selectedBrickType) return { disabled: true, isTop: false };
    const cycle = getConnectionPointCycle(selectedBrickType);
    if (cycle.length <= 1) return { disabled: true, isTop: false };
    const selection = getSelectedConnectionPoint(selectedBrickType, connectionPointIndex);
    return { disabled: false, isTop: selection?.plane === 'top' };
  }, [connectionPointIndex, selectedBrickType]);

  const isDisabled = hidden || disabled || (hideWhenPointerLocked ? isPointerLocked : false);

  return (
    <button
      onClick={() => {
        if (isDisabled) return;
        playSfx('click');
        cycleConnectionPoint();
      }}
      disabled={isDisabled}
      className={`fixed ui-safe-top ui-safe-right z-50 pointer-events-auto w-11 h-11 rounded-full border shadow-lg transition flex items-center justify-center ${
        isDisabled
          ? 'bg-gray-900/50 border-gray-800 text-gray-600'
          : isTop
            ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500 active:scale-95'
            : 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700 active:scale-95'
      }`}
      aria-label="Cycle connection point"
      title="Cycle connection point"
    >
      <AnchorIcon fontSize="small" />
    </button>
  );
};
