/**
 * Modern Form Components
 * 
 * Composants de formulaires modernes
 */

import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  icon?: React.ReactNode;
  helperText?: string;
}

/**
 * Champ de saisie moderne
 */
export const ModernInput = React.forwardRef<HTMLInputElement, ModernInputProps>(
  ({ label, error, success, icon, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-secondary,#b4b4b4)] mb-2">
            {label}
            {props.required && <span className="text-[var(--color-error,#ef4444)] ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted,#666)]">{icon}</div>}
          <input
            ref={ref}
            className={`
              w-full px-4 py-2.5 ${icon ? 'pl-10' : ''}
              bg-[var(--bg-secondary,#2d2d2d)] border rounded-lg
              text-white placeholder-[var(--text-disabled,#555)]
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-[var(--color-brand,#10a37f)] focus:border-transparent
              ${error ? 'border-[var(--color-error,#ef4444)]/50 focus:ring-[var(--color-error,#ef4444)]' : 'border-[var(--border-primary,#424242)]'}
              ${success ? 'border-[var(--color-brand,#10a37f)]/50 focus:ring-[var(--color-brand,#10a37f)]' : ''}
              ${className}
            `}
            {...props}
          />
          {error && (
            <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-error,#ef4444)] w-5 h-5" />
          )}
          {success && (
            <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-brand,#10a37f)] w-5 h-5" />
          )}
        </div>
        {error && <p className="text-[var(--color-error,#ef4444)] text-sm mt-2">{error}</p>}
        {helperText && !error && <p className="text-[var(--text-muted,#666)] text-sm mt-2">{helperText}</p>}
      </div>
    );
  }
);

ModernInput.displayName = 'ModernInput';

interface ModernTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

/**
 * Zone de texte moderne
 */
export const ModernTextarea = React.forwardRef<HTMLTextAreaElement, ModernTextareaProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-secondary,#b4b4b4)] mb-2">
            {label}
            {props.required && <span className="text-[var(--color-error,#ef4444)] ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full px-4 py-2.5 bg-[var(--bg-secondary,#2d2d2d)] border rounded-lg
            text-white placeholder-[var(--text-disabled,#555)] resize-none
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[var(--color-brand,#10a37f)] focus:border-transparent
            ${error ? 'border-[var(--color-error,#ef4444)]/50 focus:ring-[var(--color-error,#ef4444)]' : 'border-[var(--border-primary,#424242)]'}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-[var(--color-error,#ef4444)] text-sm mt-2">{error}</p>}
        {helperText && !error && <p className="text-[var(--text-muted,#666)] text-sm mt-2">{helperText}</p>}
      </div>
    );
  }
);

ModernTextarea.displayName = 'ModernTextarea';

interface ModernSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

/**
 * Sélecteur moderne
 */
export const ModernSelect = React.forwardRef<HTMLSelectElement, ModernSelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-secondary,#b4b4b4)] mb-2">
            {label}
            {props.required && <span className="text-[var(--color-error,#ef4444)] ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full px-4 py-2.5 bg-[var(--bg-secondary,#2d2d2d)] border rounded-lg
            text-white transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[var(--color-brand,#10a37f)] focus:border-transparent
            ${error ? 'border-[var(--color-error,#ef4444)]/50 focus:ring-[var(--color-error,#ef4444)]' : 'border-[var(--border-primary,#424242)]'}
            ${className}
          `}
          {...props}
        >
          <option value="">Select an option...</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-[var(--color-error,#ef4444)] text-sm mt-2">{error}</p>}
      </div>
    );
  }
);

ModernSelect.displayName = 'ModernSelect';

interface ModernCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

/**
 * Case à cocher moderne
 */
export const ModernCheckbox = React.forwardRef<HTMLInputElement, ModernCheckboxProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          ref={ref}
          type="checkbox"
          className={`
            w-5 h-5 rounded border-2 border-[var(--border-primary,#424242)]
            bg-[var(--bg-secondary,#2d2d2d)] cursor-pointer
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[var(--color-brand,#10a37f)]
            accent-[var(--color-brand,#10a37f)]
            ${className}
          `}
          {...props}
        />
        {label && <span className="text-[var(--text-secondary,#b4b4b4)]">{label}</span>}
      </label>
    );
  }
);

ModernCheckbox.displayName = 'ModernCheckbox';

interface ModernFormProps {
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

/**
 * Formulaire moderne
 */
export const ModernForm: React.FC<ModernFormProps> = ({ children, onSubmit, className = '' }) => {
  return (
    <form onSubmit={onSubmit} className={`space-y-6 ${className}`}>
      {children}
    </form>
  );
};

interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Groupe de formulaire
 */
export const FormGroup: React.FC<FormGroupProps> = ({ children, className = '' }) => {
  return <div className={`space-y-4 ${className}`}>{children}</div>;
};

interface FormRowProps {
  children: React.ReactNode;
  columns?: number;
}

/**
 * Ligne de formulaire
 */
export const FormRow: React.FC<FormRowProps> = ({ children, columns = 2 }) => {
  return (
    <div className={`grid grid-cols-${columns} gap-4`}>
      {children}
    </div>
  );
};

export default ModernForm;
