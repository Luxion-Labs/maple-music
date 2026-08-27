import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import type { ArtistRun } from '../lib/api';

interface ArtistLineProps {
  runs?: ArtistRun[];
  text: string;
  className?: string;
}

export const ArtistLine: React.FC<ArtistLineProps> = ({ runs, text, className }) => {
  const navigate = useNavigate();
  if (runs && runs.length > 0) {
    return (
      <span className={className}>
        {runs.map((run, i) => (
          <React.Fragment key={i}>
            {run.id ? (
              <button
                className="hover:underline"
                onClick={(e) => { e.stopPropagation(); navigate(`/artist/${encodeURIComponent(run.id!)}`); }}
              >
                {run.text}
              </button>
            ) : (
              run.text
            )}
            {i < runs.length - 1 && ', '}
          </React.Fragment>
        ))}
      </span>
    );
  }
  return <span className={className}>{text}</span>;
};
