import React, { useState, useCallback, useMemo } from 'react';
import { Infinity, History } from 'lucide-react';
import { usePlayer } from '../PlayerContext';
import { TrackRow } from '../../../components/TrackRow';
import { queueBlocks } from '../../../lib/queue';

export const QueueList: React.FC = () => {
  const { now, queue, playIndex, removeFromQueue, clearQueued } = usePlayer();
  const [showPrev, setShowPrev] = useState(false);

  const nowId = now?.videoId;
  const view = useMemo(() => queueBlocks(queue), [queue]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      {queue.items.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">The queue is empty.</p>
      ) : (
        <>
          {/* Earlier (before playedFrom) */}
          {view.earlier.length > 0 && (
            <h3 className="truncate px-2 pt-2 pb-1.5 text-sm font-semibold text-muted-foreground">
              {view.earlierHeading}
            </h3>
          )}
          {view.earlier.map(({ item, i }) => (
            <TrackRow
              key={item.video_id + ':' + i}
              song={item}
              active={item.video_id === nowId}
              hideRating
              onplay={() => playIndex(i)}
            />
          ))}

          {/* Prev toggle */}
          {view.prev.length > 0 && (
            <div className="flex items-center justify-between px-2 pb-1.5 pt-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Now playing</h3>
              <button
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowPrev(!showPrev)}
              >
                <History className="h-3.5 w-3.5" />
                {showPrev ? 'Hide history' : 'Show history'}
              </button>
            </div>
          )}
          {showPrev && view.prev.map(({ item, i }) => (
            <TrackRow
              key={item.video_id + ':' + i}
              song={item}
              active={item.video_id === nowId}
              hideRating
              onplay={() => playIndex(i)}
            />
          ))}

          {/* Now */}
          {view.now && (
            <>
              {!view.prev.length && (
                <h3 className="px-2 pt-2 pb-1.5 text-sm font-semibold">Now playing</h3>
              )}
              <TrackRow
                key={view.now.key}
                song={view.now.item}
                active
                hideRating
                onplay={() => playIndex(view.now!.i)}
              />
            </>
          )}

          {/* Upcoming blocks */}
          {view.blocks.map((block) => (
            <React.Fragment key={block.key}>
              {block.autoplay ? (
                <div className="mt-3 flex items-center gap-2 border-t px-2 pt-2.5 pb-1.5 text-muted-foreground">
                  <Infinity className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Autoplay</span>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between px-2 pb-1.5">
                  <h3 className="truncate text-sm font-semibold">{block.heading}</h3>
                  {block.clearable && (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={clearQueued}
                    >
                      Clear queue
                    </button>
                  )}
                </div>
              )}
              {block.rows.map(({ item, i }) => (
                <TrackRow
                  key={item.video_id + ':' + i}
                  song={item}
                  active={item.video_id === nowId}
                  hideRating
                  onplay={() => playIndex(i)}
                  onRemove={() => removeFromQueue(i)}
                  removeLabel="Remove from queue"
                />
              ))}
            </React.Fragment>
          ))}
        </>
      )}
    </div>
  );
};
