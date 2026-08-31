interface ConfidenceBadgeProps {
  confidence: number;
  size?: 'sm' | 'md';
}

export default function ConfidenceBadge({ confidence, size = 'md' }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);
  const isHigh = pct >= 90;
  const isMedium = pct >= 75 && pct < 90;
  const isLow = pct < 75;

  const color = isHigh
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : isMedium
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      : 'bg-rose-500/15 text-rose-400 border-rose-500/30';

  const dotColor = isHigh ? 'bg-emerald-400' : isMedium ? 'bg-amber-400' : 'bg-rose-400';

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${color} ${sizeClass}`}
      title={`${pct}% confidence`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {pct}%
    </span>
  );
}
