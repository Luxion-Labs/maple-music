import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, className }) => (
  <div className={cn('flex flex-col items-center gap-3 py-12 text-center', className)}>
    <AlertCircle className="h-8 w-8 text-destructive/60" />
    <p className="text-sm text-muted-foreground">{message ?? 'Something went wrong.'}</p>
    {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>}
  </div>
);
