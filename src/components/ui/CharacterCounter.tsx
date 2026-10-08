interface CharacterCounterProps {
  current: number;
  max: number;
  /**
   * When false (default), the counter is only rendered contextually when current >= 80% of max.
   * Set to true for multi-line textareas where a discrete counter is always helpful.
   */
  alwaysVisible?: boolean;
  threshold?: number;
  theme?: 'light' | 'dark';
  className?: string;
}

export const CharacterCounter = ({
  current,
  max,
  alwaysVisible = false,
  threshold = 0.8,
  theme = 'light',
  className = '',
}: CharacterCounterProps) => {
  if (max <= 0) return null;

  const percentage = (current / max) * 100;
  const minToShow = Math.ceil(max * threshold);

  if (!alwaysVisible && current < minToShow) {
    return null;
  }

  const isAtLimit = current >= max;
  const isCritical = percentage >= 90 && !isAtLimit;
  const isNearLimit = percentage >= 80 && percentage < 90;

  const baseColor =
    theme === 'dark'
      ? isAtLimit
        ? 'text-rose-400 font-bold'
        : isCritical
        ? 'text-orange-400 font-semibold'
        : isNearLimit
        ? 'text-amber-400 font-medium'
        : 'text-slate-500'
      : isAtLimit
      ? 'text-rose-600 font-bold'
      : isCritical
      ? 'text-orange-600 font-semibold'
      : isNearLimit
      ? 'text-amber-600 font-medium'
      : 'text-slate-400';

  return (
    <div
      aria-live="polite"
      title={isAtLimit ? `Límite máximo alcanzado (${max} caracteres)` : undefined}
      className={`text-[11px] font-medium tabular-nums tracking-wide transition-colors select-none ${baseColor} ${className}`}
    >
      {current} / {max}
    </div>
  );
};

