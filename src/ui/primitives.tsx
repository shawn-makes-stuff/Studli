/**
 * Shared UI primitives for consistent styling
 */

import React from 'react';

// ============== Button ==============

export type ButtonVariant = 'default' | 'primary' | 'success' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, { enabled: string; disabled: string }> = {
  default: {
    enabled: 'bg-gray-700 text-white hover:bg-gray-600',
    disabled: 'bg-gray-700 text-gray-500 cursor-not-allowed'
  },
  primary: {
    enabled: 'bg-blue-600 text-white hover:bg-blue-500',
    disabled: 'bg-blue-600/50 text-gray-300 cursor-not-allowed'
  },
  success: {
    enabled: 'bg-green-600 text-white hover:bg-green-500',
    disabled: 'bg-green-600/50 text-gray-300 cursor-not-allowed'
  },
  danger: {
    enabled: 'bg-red-600 text-white hover:bg-red-500',
    disabled: 'bg-gray-700 text-gray-500 cursor-not-allowed'
  },
  ghost: {
    enabled: 'bg-transparent text-gray-300 hover:bg-gray-700 hover:text-white',
    disabled: 'bg-transparent text-gray-600 cursor-not-allowed'
  }
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2 py-1 text-sm rounded-md',
  md: 'px-4 py-2 rounded-lg',
  lg: 'px-6 py-3 text-lg rounded-xl'
};

export const Button = ({
  variant = 'default',
  size = 'md',
  disabled = false,
  className = '',
  children,
  ...props
}: ButtonProps) => {
  const classes = variantClasses[variant];
  const baseClasses = 'transition-colors font-medium';

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${disabled ? classes.disabled : classes.enabled} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// ============== IconButton ==============

interface IconButtonProps extends Omit<ButtonProps, 'size'> {
  size?: 'sm' | 'md' | 'lg';
}

const iconSizeClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'p-1.5 rounded-lg',
  md: 'p-3 rounded-xl',
  lg: 'p-4 rounded-xl'
};

export const IconButton = ({
  variant = 'default',
  size = 'md',
  disabled = false,
  className = '',
  children,
  ...props
}: IconButtonProps) => {
  const classes = variantClasses[variant];
  const baseClasses = 'transition-all shadow-lg';

  return (
    <button
      className={`${baseClasses} ${iconSizeClasses[size]} ${disabled ? classes.disabled : classes.enabled} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// ============== Dialog ==============

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const Dialog = ({ isOpen, onClose, title, children, actions }: DialogProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-600 max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <div className="text-gray-400 mb-6">{children}</div>
        {actions && <div className="flex gap-3 justify-end">{actions}</div>}
      </div>
    </div>
  );
};

// ============== Badge ==============

interface BadgeProps {
  variant?: 'info' | 'warning' | 'success' | 'error';
  children: React.ReactNode;
  className?: string;
}

const badgeClasses: Record<string, string> = {
  info: 'bg-blue-600/30 border-blue-500 text-blue-300',
  warning: 'bg-yellow-600/30 border-yellow-500 text-yellow-300',
  success: 'bg-green-600/30 border-green-500 text-green-300',
  error: 'bg-red-600/30 border-red-500 text-red-300'
};

export const Badge = ({ variant = 'info', children, className = '' }: BadgeProps) => (
  <div className={`rounded-lg border p-2 text-sm ${badgeClasses[variant]} ${className}`}>
    {children}
  </div>
);
