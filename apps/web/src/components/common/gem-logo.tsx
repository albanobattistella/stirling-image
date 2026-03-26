export function GemLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <polygon points="70,16 100,48 70,60 40,48" fill="currentColor" opacity="1" />
      <polygon points="40,48 70,60 70,124 22,60" fill="currentColor" opacity="0.7" />
      <polygon points="100,48 70,60 70,124 118,60" fill="currentColor" opacity="0.5" />
      <polygon points="70,16 40,48 22,60" fill="currentColor" opacity="0.85" />
      <polygon points="70,16 100,48 118,60" fill="currentColor" opacity="0.65" />
      <polygon
        points="70,16 118,60 70,124 22,60"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <line
        x1="40"
        y1="48"
        x2="100"
        y2="48"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
      />
    </svg>
  );
}
