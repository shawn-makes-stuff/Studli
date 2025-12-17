/**
 * Centralized icon components for consistent styling
 */

interface IconProps {
  className?: string;
}

// Toolbar Icons
export const BrickIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="3" y="8" width="18" height="10" rx="1" />
    <rect x="5" y="5" width="4" height="3" rx="0.5" />
    <rect x="10" y="5" width="4" height="3" rx="0.5" />
    <rect x="15" y="5" width="4" height="3" rx="0.5" />
  </svg>
);

export const EditIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const RotateIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M23 4v6h-6" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

export const UndoIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M3 10h10a5 5 0 0 1 5 5v2" />
    <path d="M7 6L3 10l4 4" />
  </svg>
);

export const TrashIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const HelpIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

// Side Panel Icons
export const MenuIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M3 12h18M3 6h18M3 18h18" />
  </svg>
);

export const CloseIcon = ({ className = 'w-6 h-6' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const ChevronDownIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const ChevronRightIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const SearchIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

export const PinIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M16.5 3a1 1 0 0 1 .7 1.7l-3.1 3.1 3.8 3.8a1 1 0 0 1-.7 1.7h-3.2l-2.1 6.2a1 1 0 0 1-1.9-.1L7.8 13H4.5a1 1 0 0 1-.7-1.7l8.4-8.4a1 1 0 0 1 .7-.3z" />
  </svg>
);

export const PinOffIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M16.5 3 8 11.5M8.7 5.3l6 6" />
    <path d="M3 3l18 18" />
    <path d="M9.8 14.2 7 21l2.8-7.2h-4a1 1 0 0 1-.7-1.7l1.9-1.9" />
  </svg>
);
