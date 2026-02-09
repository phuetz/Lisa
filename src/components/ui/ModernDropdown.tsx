import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  divider?: boolean;
  danger?: boolean;
}

interface ModernDropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  width?: string;
}

export function ModernDropdown({
  trigger,
  items,
  align = 'left',
  width = 'w-56',
}: ModernDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled && item.onClick) {
      item.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          role="menu"
          className={`
            absolute z-50 mt-2 ${width}
            bg-[var(--bg-panel,#1a1a26)] backdrop-blur-xl
            border border-[var(--border-primary,#2d2d44)]
            rounded-lg shadow-2xl
            overflow-hidden
            animate-in fade-in zoom-in-95 duration-200
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
        >
          {items.map((item, index) => (
            <div key={item.id || index}>
              {item.divider ? (
                <div role="separator" className="my-1 border-t border-[var(--border-primary,#2d2d44)]" />
              ) : (
                <button
                  role="menuitem"
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={`
                    w-full px-4 py-2.5 text-left
                    flex items-center gap-3
                    transition-colors duration-150
                    ${item.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : item.danger
                        ? 'text-[var(--color-error,#ef4444)] hover:bg-[var(--color-error-subtle,rgba(239,68,68,0.15))]'
                        : 'text-[var(--text-secondary,#9898b0)] hover:bg-[var(--bg-hover,rgba(255,255,255,0.06))]'
                    }
                  `}
                >
                  {item.icon && <span className="text-lg">{item.icon}</span>}
                  <span className="text-sm">{item.label}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ModernSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; icon?: ReactNode }>;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
}

export function ModernSelectDropdown({
  value,
  onChange,
  options,
  placeholder = 'Sélectionner...',
  disabled = false,
  label,
  error,
}: ModernSelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  const items: DropdownItem[] = options.map((option) => ({
    id: option.value,
    label: option.label,
    icon: option.icon,
    onClick: () => onChange(option.value),
  }));

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[var(--text-secondary,#9898b0)] mb-2">
          {label}
        </label>
      )}
      <ModernDropdown
        trigger={
          <button
            disabled={disabled}
            className={`
              w-full px-4 py-2.5 rounded-lg
              bg-[var(--bg-surface,#12121a)] backdrop-blur-sm
              border transition-all duration-200
              flex items-center justify-between
              ${error
                ? 'border-[var(--color-error,#ef4444)] focus:ring-2 focus:ring-[var(--color-error,#ef4444)]/50'
                : 'border-[var(--border-primary,#2d2d44)] focus:border-[var(--color-accent,#f5a623)] focus:ring-2 focus:ring-[var(--color-accent,#f5a623)]/50'
              }
              ${disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-[var(--bg-hover,rgba(255,255,255,0.06))] cursor-pointer'
              }
            `}
          >
            <div className="flex items-center gap-2">
              {selectedOption?.icon}
              <span className={selectedOption ? 'text-[var(--text-primary,#e8e8f0)]' : 'text-[var(--text-muted,#6a6a82)]'}>
                {selectedOption?.label || placeholder}
              </span>
            </div>
            <ChevronDown
              size={18}
              className="transition-transform duration-200"
            />
          </button>
        }
        items={items}
        width="w-full"
      />
      {error && <p className="mt-1 text-sm text-[var(--color-error,#ef4444)]">{error}</p>}
    </div>
  );
}
