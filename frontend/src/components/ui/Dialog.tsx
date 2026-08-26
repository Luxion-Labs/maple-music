import React, { Fragment, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface DialogRootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onEscapeKeyDown?: (e: KeyboardEvent) => void;
  onPointerDownOutside?: (e: React.PointerEvent) => void;
}

const DialogRoot: React.FC<DialogRootProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

const DialogContext = React.createContext<{ open: boolean; onOpenChange: (open: boolean) => void } | null>(null);

const DialogContent: React.FC<DialogContentProps> = ({ className, onEscapeKeyDown, onPointerDownOutside, children, ...props }) => {
  const context = React.useContext(DialogContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!context) return;
    
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onEscapeKeyDown) {
          onEscapeKeyDown(e);
        }
        if (!e.defaultPrevented) {
          context.onOpenChange(false);
        }
      }
    };
    if (context.open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [context, onEscapeKeyDown]);

  if (!context || !context.open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (onPointerDownOutside) {
      onPointerDownOutside(e as any);
      if (e.defaultPrevented) return;
    }
    context.onOpenChange(false);
  };

  return (
    <Fragment>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-6 shadow-2xl',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </Fragment>
  );
};

const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('mb-4 space-y-1', className)} {...props} />
);

const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h2 className={cn('text-lg font-semibold', className)} {...props} />
);

const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn('text-sm text-muted-foreground', className)} {...props} />
);

const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('mt-4 flex justify-end gap-2', className)} {...props} />
);

const DialogClose: React.FC<{ onClose: () => void; children?: React.ReactNode }> = ({ onClose, children }) => (
  <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
    {children ?? '✕'}
  </button>
);

export interface DialogProps {
  Root: typeof DialogRoot;
  Content: typeof DialogContent;
  Header: typeof DialogHeader;
  Title: typeof DialogTitle;
  Description: typeof DialogDescription;
  Footer: typeof DialogFooter;
  Close: typeof DialogClose;
}

export const Dialog: DialogProps = {
  Root: DialogRoot,
  Content: DialogContent,
  Header: DialogHeader,
  Title: DialogTitle,
  Description: DialogDescription,
  Footer: DialogFooter,
  Close: DialogClose,
};
