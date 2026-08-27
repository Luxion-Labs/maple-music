import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { hexToHsv, hsvToHex } from '../lib/color';

interface Props {
  value: string;
  onChange: (hex: string) => void;
}

export const ColorPicker: React.FC<Props> = ({ value, onChange }) => {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [text, setText] = useState(value);
  const svRef = useRef<HTMLDivElement>(null);
  const hRef = useRef<HTMLDivElement>(null);
  const draggingSV = useRef(false);
  const draggingH = useRef(false);

  useEffect(() => {
    const h = hexToHsv(value);
    setHsv(h);
    setText(value);
  }, [value]);

  function commit(h: number, s: number, v: number) {
    const hex = hsvToHex(h, s, v);
    setText(hex);
    onChange(hex);
  }

  function svPointer(e: React.PointerEvent) {
    const rect = svRef.current!.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    const next = { ...hsv, s, v };
    setHsv(next);
    commit(next.h, next.s, next.v);
  }

  function hPointer(e: React.PointerEvent) {
    const rect = hRef.current!.getBoundingClientRect();
    const h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
    const next = { ...hsv, h };
    setHsv(next);
    commit(next.h, next.s, next.v);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* SV box */}
      <div
        ref={svRef}
        className="relative h-36 w-full cursor-crosshair rounded-md"
        style={{ background: `hsl(${hsv.h}, 100%, 50%)` }}
        onPointerDown={(e) => { draggingSV.current = true; e.currentTarget.setPointerCapture(e.pointerId); svPointer(e); }}
        onPointerMove={(e) => { if (draggingSV.current) svPointer(e); }}
        onPointerUp={() => { draggingSV.current = false; }}
      >
        <div className="pointer-events-none absolute inset-0 rounded-md" style={{ background: 'linear-gradient(to right, #fff, transparent)' }} />
        <div className="pointer-events-none absolute inset-0 rounded-md" style={{ background: 'linear-gradient(to top, #000, transparent)' }} />
        <div
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hRef}
        className="relative h-4 w-full cursor-pointer rounded-full"
        style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
        onPointerDown={(e) => { draggingH.current = true; e.currentTarget.setPointerCapture(e.pointerId); hPointer(e); }}
        onPointerMove={(e) => { if (draggingH.current) hPointer(e); }}
        onPointerUp={() => { draggingH.current = false; }}
      >
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${(hsv.h / 360) * 100}%` }}
        />
      </div>

      {/* Hex input */}
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
            const h = hexToHsv(e.target.value);
            setHsv(h);
            onChange(e.target.value);
          }
        }}
        className="rounded-lg border bg-background px-3 py-1.5 font-mono text-sm outline-hidden focus:ring-2 focus:ring-primary/50"
        placeholder="#rrggbb"
        spellCheck={false}
      />
    </div>
  );
};
