import React from 'react';
import { cn } from '../../lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'top' }) => {
  const [show, setShow] = React.useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow',
            side === 'top' && 'bottom-full left-1/2 mb-1 -translate-x-1/2',
            side === 'bottom' && 'top-full left-1/2 mt-1 -translate-x-1/2',
            side === 'left' && 'right-full top-1/2 mr-1 -translate-y-1/2',
            side === 'right' && 'left-full top-1/2 ml-1 -translate-y-1/2',
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
};

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const TooltipTrigger: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const TooltipContent: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
