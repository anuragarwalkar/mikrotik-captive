// Animated MikroTik / router shield logo
export default function RouterLogo({ size = 80 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="animate-glow-pulse"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer hexagon */}
      <polygon
        points="40,4 72,22 72,58 40,76 8,58 8,22"
        stroke="url(#logoGrad)"
        strokeWidth="1.5"
        fill="none"
        filter="url(#glow)"
        opacity="0.7"
      />
      {/* Inner hexagon */}
      <polygon
        points="40,14 62,26 62,54 40,66 18,54 18,26"
        stroke="url(#logoGrad)"
        strokeWidth="1"
        fill="rgba(0,212,255,0.04)"
        filter="url(#glow)"
        opacity="0.5"
      />

      {/* Router icon */}
      <rect x="25" y="30" width="30" height="18" rx="3" fill="url(#logoGrad)" opacity="0.9" />
      <rect x="28" y="33" width="4" height="3" rx="1" fill="#020309" />
      <rect x="34" y="33" width="4" height="3" rx="1" fill="#020309" />
      <rect x="40" y="33" width="4" height="3" rx="1" fill="#020309" />
      <rect x="46" y="33" width="4" height="3" rx="1" fill="#020309" />
      {/* Signal arcs */}
      <path d="M35 27 Q40 23 45 27" stroke="#00d4ff" strokeWidth="1.5" fill="none" filter="url(#glow)" />
      <path d="M32 25 Q40 19 48 25" stroke="#7c3aed" strokeWidth="1" fill="none" filter="url(#glow)" opacity="0.7" />
      {/* Status dot */}
      <circle cx="40" cy="54" r="2.5" fill="#00ff88" filter="url(#glow)" />
    </svg>
  )
}
