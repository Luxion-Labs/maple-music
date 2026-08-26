import React from 'react';
import { Skeleton } from './ui/Skeleton';

export const MediaCardSkeleton: React.FC = () => (
  <div className="flex flex-col gap-2">
    <Skeleton className="aspect-square w-full rounded-lg" />
    <Skeleton className="h-3.5 w-4/5 rounded" />
    <Skeleton className="h-3 w-3/5 rounded" />
  </div>
);
