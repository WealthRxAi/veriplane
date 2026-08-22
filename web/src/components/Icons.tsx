import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function GridIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...base}
      {...props}
    >
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}
export function PulseIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...base}
      {...props}
    >
      <path d="M3 12h4l2.2-6 4.1 12 2.2-6H21" />
    </svg>
  );
}
export function NodesIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...base}
      {...props}
    >
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="7" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="m8.4 6.2 7.1.5M7.5 8l3.4 7.8m5.6-6.7-3.3 6.7" />
    </svg>
  );
}
export function PlugIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...base}
      {...props}
    >
      <path d="M9 3v5m6-5v5M7 8h10v2a5 5 0 0 1-5 5v0a5 5 0 0 1-5-5V8Zm5 7v6" />
    </svg>
  );
}
export function SettingsIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...base}
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}
export function ArrowIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...base}
      {...props}
    >
      <path d="m8 16 8-8m-7 0h7v7" />
    </svg>
  );
}
export function CheckIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...base}
      {...props}
    >
      <path d="m5 12.5 4.3 4.3L19 7" />
    </svg>
  );
}
export function SparkIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      {...base}
      {...props}
    >
      <path d="M12 2.8c.6 5 2.6 7 7.6 7.6-5 .6-7 2.6-7.6 7.6-.6-5-2.6-7-7.6-7.6 5-.6 7-2.6 7.6-7.6Z" />
      <path d="M19 16.5c.2 1.7.9 2.4 2.6 2.6-1.7.2-2.4.9-2.6 2.6-.2-1.7-.9-2.4-2.6-2.6 1.7-.2 2.4-.9 2.6-2.6Z" />
    </svg>
  );
}
