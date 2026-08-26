import React from 'react';
import { cn } from '../lib/utils';

interface Props { class?: string; className?: string }

export const ExplicitIcon: React.FC<Props> = ({ className }) => (
  <span
    className={cn('inline-flex items-center justify-center rounded-sm bg-muted-foreground/60 text-background font-bold leading-none', className)}
    style={{ fontSize: '0.6em', width: '1.45em', height: '1.45em' }}
    aria-label="Explicit"
    title="Explicit"
  >
    E
  </span>
);
