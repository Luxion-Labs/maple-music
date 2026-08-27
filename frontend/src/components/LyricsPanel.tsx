import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Maximize2, Minimize2 } from 'lucide-react';
import { LyricsView } from './LyricsView';
import { usePlayer } from '../features/player/PlayerContext';

interface Props {
  onClose: () => void;
  queueOpen?: boolean;
}

export const LyricsPanel: React.FC<Props> = ({ onClose, queueOpen = false }) => {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();

  // Close on navigation when expanded
  React.useEffect(() => {
    if (expanded) onClose();
  }, [location.pathname]);

  return (
    <>
      <button
        className="fixed inset-0 z-20 cursor-default bg-black/40 lg:hidden"
        onClick={onClose}
        aria-label="Close lyrics"
      />
      <aside
        className={
          expanded
            ? `absolute inset-y-0 left-16 right-0 z-30 flex h-full flex-col border-l bg-card shadow-2xl lg:left-60 ${queueOpen ? 'lg:right-80' : ''}`
            : `absolute inset-y-0 right-0 z-30 flex h-full w-80 max-w-[80vw] flex-col border-l bg-card shadow-2xl ${queueOpen ? 'lg:right-80' : ''}`
        }
      >
        <div className="shrink-0 border-b pt-safe">
          <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-heading text-sm font-semibold">Lyrics</h2>
          <button
            onClick={() => setExpanded(!expanded)}
            className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
            aria-label={expanded ? 'Shrink lyrics' : 'Expand lyrics'}
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
        </div>
        <LyricsView expanded={expanded} />
      </aside>
    </>
  );
};
