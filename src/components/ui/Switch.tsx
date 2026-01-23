/**
 * Switch Component
 * Toggle switch moderne
 */

import { cn } from '../../utils/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch = ({ 
  checked, 
  onChange, 
  label, 
  disabled = false,
  className 
}: SwitchProps) => {
  return (
    <label className={cn('inline-flex items-center gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <div 
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors',
          checked ? 'bg-blue-600' : 'bg-[#404040]',
          disabled && 'cursor-not-allowed'
        )}
        onClick={() => !disabled && onChange(!checked)}
      >
        <div 
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md',
            checked && 'translate-x-5'
          )}
        />
      </div>
      {label && <span className="text-sm text-white">{label}</span>}
    </label>
  );
};

export default Switch;
