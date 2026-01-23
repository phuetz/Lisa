/**
 * Modern Button Components
 * 
 * Composants de boutons modernes avec variantes
 */

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * Bouton moderne
 */
export const ModernButton = React.forwardRef<HTMLButtonElement, ModernButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      loading = false,
      fullWidth = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white',
      secondary: 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600',
      danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white',
      success: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white',
      ghost: 'bg-transparent hover:bg-slate-700 text-slate-300 border border-slate-600',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm rounded-lg',
      md: 'px-4 py-2 text-base rounded-lg',
      lg: 'px-6 py-3 text-lg rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          flex items-center justify-center gap-2
          font-medium transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:shadow-lg hover:shadow-blue-500/25
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 
          focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
          ${className}
        `}
        {...props}
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    );
  }
);

ModernButton.displayName = 'ModernButton';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

/**
 * Bouton icône
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', variant = 'secondary', className = '', ...props }, ref) => {
    const sizeClasses = {
      sm: 'p-1.5 text-sm',
      md: 'p-2 text-base',
      lg: 'p-3 text-lg',
    };

    const variantClasses = {
      primary: 'bg-blue-500 hover:bg-blue-600 text-white',
      secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-300',
      danger: 'bg-red-500 hover:bg-red-600 text-white',
      ghost: 'bg-transparent hover:bg-slate-700 text-slate-300 border border-slate-600',
    };

    return (
      <button
        ref={ref}
        className={`
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          rounded-lg transition-all duration-200
          hover:shadow-lg
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
          ${className}
        `}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Groupe de boutons
 */
export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex gap-2 ${className}`}>
      {children}
    </div>
  );
};

interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label?: string;
}

/**
 * Bouton d'action flottant
 */
export const FloatingActionButton = React.forwardRef<
  HTMLButtonElement,
  FloatingActionButtonProps
>(({ icon, label, className = '', ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={`
        fixed bottom-8 right-8 w-14 h-14 rounded-full
        bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700
        text-white shadow-lg hover:shadow-xl
        flex items-center justify-center
        transition-all duration-200 hover:scale-110
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900
        ${className}
      `}
      title={label}
      aria-label={label}
      {...props}
    >
      {icon}
    </button>
  );
});

FloatingActionButton.displayName = 'FloatingActionButton';

export default ModernButton;
