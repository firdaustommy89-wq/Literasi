import React, { useState } from 'react';

interface SchoolLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  className = 'w-10 h-12',
  size,
  alt = 'Logo SMAN 2 Samarinda',
}) => {
  const [hasError, setHasError] = useState(false);

  if (!hasError) {
    return (
      <img
        src="/logo-smada.png"
        alt={alt}
        className={`object-contain select-none drop-shadow-sm ${className}`}
        style={size ? { width: size, height: size * 1.1 } : undefined}
        onError={() => setHasError(true)}
        loading="eager"
      />
    );
  }

  return (
    <svg
      viewBox="0 0 200 240"
      className={className}
      style={size ? { width: size, height: size * 1.2 } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Subtle drop shadow */}
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
        </filter>
        {/* Gold gradient for star and ribbon */}
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
        {/* Light blue for book */}
        <linearGradient id="bookGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#bae6fd" />
        </linearGradient>
      </defs>

      {/* Main Shield / Perisai SMAN 2 */}
      <path
        d="M 30,24 C 20,24 12,18 2,22 L 2,138 C 2,188 80,222 100,238 C 120,222 198,188 198,138 L 198,22 C 188,18 180,24 170,24 C 150,0 50,0 30,24 Z"
        fill="#05883b"
        stroke="#111827"
        strokeWidth="3.5"
        strokeLinejoin="round"
        filter="url(#logoShadow)"
      />

      {/* Inner subtle border */}
      <path
        d="M 32,27 C 22,27 15,22 6,25 L 6,136 C 6,184 82,217 100,232 C 118,217 194,184 194,136 L 194,25 C 185,22 178,27 168,27 C 148,4 52,4 32,27 Z"
        fill="none"
        stroke="#047857"
        strokeWidth="1.5"
      />

      {/* Text Top: SMAN 2 */}
      <text
        x="100"
        y="21"
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', Arial, sans-serif"
        fontWeight="900"
        fontSize="17"
        fill="#0f172a"
        letterSpacing="0.5"
      >
        SMAN 2
      </text>

      {/* Five-Pointed Star (Bintang Emas) */}
      {/* Center at (100, 48) */}
      <polygon
        points="100,28 106,44 123,44 109,54 114,70 100,60 86,70 91,54 77,44 94,44"
        fill="url(#goldGrad)"
        stroke="#b45309"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Sayap / Sayap Putih Kiri (Left Wing) */}
      <path
        d="M 40,158 C 30,135 25,100 28,68 C 34,58 40,54 44,52 C 40,65 38,82 42,98 C 46,85 52,70 60,62 C 55,78 54,96 60,112 C 64,102 70,88 78,82 C 70,105 68,128 78,148 C 65,155 50,158 40,158 Z"
        fill="#ffffff"
        stroke="#dc2626"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Sayap / Sayap Putih Kanan (Right Wing) */}
      <path
        d="M 160,158 C 170,135 175,100 172,68 C 166,58 160,54 156,52 C 160,65 162,82 158,98 C 154,85 148,70 140,62 C 145,78 146,96 140,112 C 136,102 130,88 122,82 C 130,105 132,128 122,148 C 135,155 150,158 160,158 Z"
        fill="#ffffff"
        stroke="#dc2626"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Open Book (Buku Terbuka) in Center */}
      <path
        d="M 100,85 C 115,80 135,76 150,78 L 150,122 C 135,120 115,124 100,130 C 85,124 65,120 50,122 L 50,78 C 65,76 85,80 100,85 Z"
        fill="url(#bookGrad)"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Center spine of the book */}
      <line x1="100" y1="85" x2="100" y2="130" stroke="#0284c7" strokeWidth="1.5" />

      {/* Teratai / Lotus White Blossom on Book */}
      <path
        d="M 100,100 C 94,106 90,116 100,126 C 110,116 106,106 100,100 Z"
        fill="#ffffff"
        stroke="#0369a1"
        strokeWidth="0.8"
      />
      <path
        d="M 94,105 C 86,110 84,118 92,124 C 95,120 97,114 94,105 Z"
        fill="#ffffff"
        stroke="#0369a1"
        strokeWidth="0.8"
      />
      <path
        d="M 106,105 C 114,110 116,118 108,124 C 105,120 103,114 106,105 Z"
        fill="#ffffff"
        stroke="#0369a1"
        strokeWidth="0.8"
      />

      {/* 5 Interlinked Yellow Olympic/Unity Rings below Book */}
      <g stroke="#facc15" strokeWidth="2.4" fill="none">
        <circle cx="78" cy="148" r="9" />
        <circle cx="93" cy="148" r="9" />
        <circle cx="108" cy="148" r="9" />
        <circle cx="123" cy="148" r="9" />
      </g>
      <circle cx="85" cy="154" r="8.5" stroke="#facc15" strokeWidth="2.2" fill="none" />
      <circle cx="115" cy="154" r="8.5" stroke="#facc15" strokeWidth="2.2" fill="none" />

      {/* Pita Kuning Lengkung (Ribbon Bottom) */}
      {/* Ribbon tails */}
      <polygon points="32,192 18,176 38,168 45,185" fill="#eab308" stroke="#111827" strokeWidth="1.2" />
      <polygon points="168,192 182,176 162,168 155,185" fill="#eab308" stroke="#111827" strokeWidth="1.2" />

      {/* Main curved ribbon banner */}
      <path
        d="M 34,186 Q 100,214 166,186 L 160,165 Q 100,193 40,165 Z"
        fill="url(#goldGrad)"
        stroke="#111827"
        strokeWidth="2"
      />

      {/* Text on Ribbon: SAMARINDA */}
      <path id="ribbonPath" d="M 42,183 Q 100,207 158,183" fill="none" />
      <text fill="#111827" fontFamily="'Plus Jakarta Sans', Arial, sans-serif" fontWeight="900" fontSize="13.5" letterSpacing="0.8">
        <textPath href="#ribbonPath" startOffset="50%" textAnchor="middle">
          SAMARINDA
        </textPath>
      </text>
    </svg>
  );
};
