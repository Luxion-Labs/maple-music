import { useState } from 'react';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { Minus, Plus, FastForward, Activity } from 'lucide-react';

interface TempoPitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  speed: number;
  semitones: number;
  onSpeedChange: (speed: number) => void;
  onSemitonesChange: (semitones: number) => void;
  inRoom?: boolean;
}

const SPEEDS = Array.from({ length: 36 }, (_, i) => Math.round((0.25 + i * 0.05) * 100) / 100);
const SEMITONES = { min: -12, max: 12 };

export function TempoPitchDialog({
  open,
  onOpenChange,
  speed,
  semitones,
  onSpeedChange,
  onSemitonesChange,
  inRoom = false,
}: TempoPitchDialogProps) {
  const speedIndex = Math.max(0, SPEEDS.indexOf(speed));

  const handleSpeedStep = (dir: number) => {
    const newIndex = speedIndex + dir;
    if (newIndex >= 0 && newIndex < SPEEDS.length) {
      onSpeedChange(SPEEDS[newIndex]);
    }
  };

  const handleSemitonesStep = (dir: number) => {
    const newSemitones = semitones + dir;
    if (newSemitones >= SEMITONES.min && newSemitones <= SEMITONES.max) {
      onSemitonesChange(newSemitones);
    }
  };

  const handleReset = () => {
    onSpeedChange(1);
    onSemitonesChange(0);
  };

  const Stepper = ({
    icon: Icon,
    label,
    value,
    onStep,
    atMin,
    atMax,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    onStep: (dir: number) => void;
    atMin: boolean;
    atMax: boolean;
  }) => (
    <div className="flex items-center gap-4">
      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm">{label}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={atMin}
        onClick={() => onStep(-1)}
        aria-label={`Decrease ${label}`}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-16 text-center font-medium tabular-nums">{value}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={atMax}
        onClick={() => onStep(1)}
        aria-label={`Increase ${label}`}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="gap-5 sm:max-w-sm">
        <div className="grid gap-1">
          <Dialog.Title className="text-lg font-semibold">Tempo and pitch</Dialog.Title>
          <Dialog.Description className="text-xs text-muted-foreground">
            Applies to everything you play, until you change it back or restart the app.
          </Dialog.Description>
        </div>

        <div className="flex flex-col gap-4">
          {/* Tempo moves you off the shared clock, so it's out while a room is on. Pitch is yours
              alone: it changes nothing about when the next track starts. */}
          {!inRoom && (
            <Stepper
              icon={FastForward}
              label="Tempo"
              value={`${speed.toFixed(2)}x`}
              onStep={handleSpeedStep}
              atMin={speedIndex === 0}
              atMax={speedIndex === SPEEDS.length - 1}
            />
          )}
          <Stepper
            icon={Activity}
            label="Pitch"
            value={semitones > 0 ? `+${semitones}` : String(semitones)}
            onStep={handleSemitonesStep}
            atMin={semitones === SEMITONES.min}
            atMax={semitones === SEMITONES.max}
          />
        </div>

        <div className="flex justify-end gap-2">
          {/* Reset does not close: you're usually resetting to hear the difference. */}
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
