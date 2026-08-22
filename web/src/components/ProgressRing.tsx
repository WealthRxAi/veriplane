export function ProgressRing({
  value,
  size = 154,
}: {
  value: number;
  size?: number;
}) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div
      className="progress-ring"
      style={{ width: size, height: size }}
      aria-label={`${value}% verified progress`}
      role="img"
    >
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle className="ring-track" cx="70" cy="70" r={radius} />
        <circle
          className="ring-value"
          cx="70"
          cy="70"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-label">
        <strong>{value}</strong>
        <span>% verified</span>
      </div>
    </div>
  );
}
