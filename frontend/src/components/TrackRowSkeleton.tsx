import React from 'react';
import { Skeleton } from './ui/Skeleton';

export const TrackRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-2 py-1.5">
    <Skeleton className="h-10 w-10 rounded" />
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-3.5 w-3/5 rounded" />
      <Skeleton className="h-3 w-2/5 rounded" />
    </div>
    <Skeleton className="h-3 w-8 rounded" />
  </div>
);
