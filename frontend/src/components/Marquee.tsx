import React, { useRef, useEffect, useState } from 'react';
import { cn } from '../lib/utils';

interface MarqueeProps {
  text: string;
  className?: string;
}

export const Marquee: React.FC<MarqueeProps> = ({ text, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div className={cn('overflow-hidden', className)}>
      <div
        ref={ref}
        className={cn('whitespace-nowrap', overflow && 'animate-marquee')}
      >
        {text}
        {overflow && <span className="px-8">{text}</span>}
      </div>
    </div>
  );
};
