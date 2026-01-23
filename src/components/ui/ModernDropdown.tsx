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
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`
            absolute z-50 mt-2 ${width}
            bg-slate-800 backdrop-blur-xl
            border border-slate-700/50
            rounded-lg shadow-2xl
            overflow-hidden
            animate-in fade-in zoom-in-95 duration-200
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
        >
          {items.map((item, index) => (
            <div key={item.id || index}>
              {item.divider ? (
                <div className="my-1 border-t border-slate-700/50" />
              ) : (
                <button
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={`
                    w-full px-4 py-2.5 text-left
                    flex items-center gap-3
                    transition-colors duration-150
                    ${item.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : item.danger
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-slate-300 hover:bg-slate-700/50'
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
        <label className="block text-sm font-medium text-slate-300 mb-2">
          {label}
        </label>
      )}
      <ModernDropdown
        trigger={
          <button
            disabled={disabled}
            className={`
              w-full px-4 py-2.5 rounded-lg
              bg-slate-700/50 backdrop-blur-sm
              border transition-all duration-200
              flex items-center justify-between
              ${error
                ? 'border-red-500 focus:ring-2 focus:ring-red-500/50'
                : 'border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50'
              }
              ${disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-slate-700 cursor-pointer'
              }
            `}
          >
            <div className="flex items-center gap-2">
              {selectedOption?.icon}
              <span className={selectedOption ? 'text-slate-200' : 'text-slate-400'}>
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
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}
