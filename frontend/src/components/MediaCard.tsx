import React from 'react';
import { cn } from '../lib/utils';
import { thumb } from '../lib/thumb';
import { isLocalId, ON_REPEAT_ID } from '../lib/api';
import type { BrowseItem } from '../lib/api';
import { openItem, playItem } from '../lib/browse';
import { setDragItem } from '../lib/dnd';
import { useNavigate } from 'react-router-dom';
import { Play, Music, User, RefreshCw } from 'lucide-react';
import { TrackMenu } from './TrackMenu';
import { PlaylistMenu } from './PlaylistMenu';
import { ExplicitIcon } from './ExplicitIcon';
import { usePlayer } from '../features/player/PlayerContext';
import { usePersonal } from '../features/home/PersonalContext';

interface Props { item: BrowseItem; compact?: boolean }

export const MediaCard: React.FC<Props> = ({ item, compact = false }) => {
  const navigate = useNavigate();
  const { openAddToPlaylist, asSong } = usePlayer();
  const round = item.kind === 'artist';
  const onRepeat = item.id === ON_REPEAT_ID;
  const [attempt, setAttempt] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => { setAttempt(0); }, [item.thumbnail]);

  const sized = thumb(item.thumbnail, 400);
  const small = thumb(item.thumbnail, 200);
  const src = attempt === 0 ? sized : item.thumbnail;
  const srcSet = attempt === 0 && small && sized && small !== sized
    ? `${small} 1x, ${sized} 2x` : undefined;

  async function playNow(e: React.MouseEvent) {
    e.stopPropagation();
    if (playing) return;
    setPlaying(true);
    try { await playItem(item, navigate); }
    finally { setPlaying(false); }
  }

  function handleOpen() {
    if (item.kind === 'song') {
      playItem(item, navigate).catch(() => {});
    } else {
      navigate(item.kind === 'album' ? `/album/${encodeURIComponent(item.id)}`
        : item.kind === 'artist' ? `/artist/${encodeURIComponent(item.id)}`
        : `/playlist/${encodeURIComponent(item.id)}`);
    }
  }

  return (
    <div className="group relative flex w-full flex-col gap-2">
      <div
        className={cn(
          'flex flex-col text-left transition-colors hover:bg-accent/10 cursor-pointer',
          compact ? 'gap-1.5 rounded-lg p-1.5' : 'gap-2 rounded-xl p-2',
        )}
        role="button"
        tabIndex={0}
        draggable
        onDragStart={(e) => setDragItem(e, item)}
        onClick={handleOpen}
        onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen(); } }}
        title={item.subtitle ? `${item.title} — ${item.subtitle}` : item.title}
      >
        <div className="relative">
          <div className={cn('relative aspect-square w-full overflow-hidden bg-muted', round ? 'rounded-full' : 'rounded-lg')}>
            {item.thumbnail && attempt < 2 && !onRepeat ? (
              <img
                src={src ?? undefined}
                srcSet={srcSet}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                loading="lazy"
                draggable={false}
                onError={() => setAttempt((a) => (a === 0 && sized !== item.thumbnail ? 1 : 2))}
              />
            ) : (
              <div className={cn('flex h-full w-full items-center justify-center', onRepeat ? 'bg-primary/10 text-primary' : 'text-muted-foreground/50')}>
                {round ? <User className={compact ? 'h-5 w-5' : 'h-7 w-7'} />
                  : onRepeat ? <RefreshCw className={compact ? 'h-7 w-7' : 'h-10 w-10'} />
                  : <Music className={compact ? 'h-5 w-5' : 'h-7 w-7'} />}
              </div>
            )}
            {item.kind !== 'artist' && (
              <button
                className={cn(
                  'absolute flex translate-y-1 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition-[opacity,transform] duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 focus-visible:opacity-100',
                  playing && 'animate-pulse',
                  compact ? 'bottom-1.5 right-1.5 h-7 w-7' : 'bottom-2 right-2 h-9 w-9',
                )}
                disabled={playing}
                aria-label="Play"
                onClick={playNow}
              >
                <Play className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
              </button>
            )}
          </div>
        </div>
        <div className={cn('min-w-0', round && 'text-center')}>
          <div className={cn('truncate font-medium', compact ? 'text-xs' : 'text-sm')}>{item.title}</div>
          {(item.subtitle || item.explicit) && (
            <div className={cn('flex items-center gap-1 text-muted-foreground', round && 'justify-center', compact ? 'text-[0.6875rem]' : 'text-xs')}>
              {item.explicit && <ExplicitIcon className="h-3 w-3 shrink-0" />}
              <span className="truncate">{item.subtitle}</span>
            </div>
          )}
        </div>
      </div>

      {item.kind === 'song' ? (
        <TrackMenu
          song={{ video_id: item.id, title: item.title, artists: item.subtitle ?? '', thumbnail: item.thumbnail, explicit: item.explicit } as any}
          onAdd={() => openAddToPlaylist([{ video_id: item.id, title: item.title, artists: item.subtitle ?? '', thumbnail: item.thumbnail } as any])}
          triggerClass="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-md transition hover:bg-background focus-visible:opacity-100 group-hover:opacity-100 cursor-pointer"
        />
      ) : (
        <PlaylistMenu
          item={item}
          showPin={item.kind === 'playlist'}
          triggerClass="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-md transition hover:bg-background focus-visible:opacity-100 group-hover:opacity-100 cursor-pointer"
        />
      )}
    </div>
  );
};
