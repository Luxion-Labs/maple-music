import React from 'react';
import { cn } from '../lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * A self-contained on/off switch. The thumb is anchored by a left offset so it always stays
 * fully inside the track in both states, unlike ad-hoc absolute+translate toggles that can
 * overhang their rounded ends. Sized to be comfortable to tap on touch screens.
 */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, id, className, ariaLabel }) => {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted',
        className,
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-5 w-5 translate-x-1 rounded-full bg-white shadow-md transition-transform duration-200',
          checked && 'translate-x-6',
        )}
      />
    </button>
  );
};
