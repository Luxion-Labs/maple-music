import React from 'react';
import { QueueList } from '../features/player/components/QueueList';

interface Props {
  onClose: () => void;
}

export const QueuePanel: React.FC<Props> = ({ onClose }) => (
  <>
    <button
      className="fixed inset-0 z-20 cursor-default bg-black/40 lg:hidden"
      onClick={onClose}
      aria-label="Close queue"
    />
    <aside className="absolute inset-y-0 right-0 z-30 flex h-full w-80 max-w-[80vw] flex-col border-l bg-card shadow-2xl animate-in slide-in-from-right duration-200">
      <h2 className="border-b px-4 py-3 font-heading text-sm font-semibold">Queue</h2>
      <QueueList />
    </aside>
  </>
);
