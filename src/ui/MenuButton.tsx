import MenuIcon from '@mui/icons-material/Menu';
import { useBrickStore } from '../store/useBrickStore';
import { playSfx } from '../utils/sfx';

export const MenuButton = () => {
  const openMenu = useBrickStore((state) => state.openMenu);

  return (
    <button
      onClick={() => {
        playSfx('click');
        if (document.pointerLockElement) document.exitPointerLock();
        openMenu();
      }}
      className="fixed ui-safe-top ui-safe-left z-50 pointer-events-auto w-11 h-11 rounded-full bg-gray-800 border border-gray-600 text-white shadow-lg hover:bg-gray-700 active:scale-95 transition flex items-center justify-center"
      aria-label="Menu"
      title="Menu"
    >
      <MenuIcon fontSize="small" />
    </button>
  );
};

