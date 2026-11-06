import React from 'react';

// Original illustration: a health worker on a house visit in Barangay Tago.
// Health center on the left, a nipa house and a concrete house on the right.
const NAVY = '#1e3d59';
const WOOD = '#8a6a3e';

export function LoginIllustration() {
  return (
    <svg className="login-illustration" viewBox="0 -240 640 760" preserveAspectRatio="xMidYMax slice" role="img" aria-label="A barangay health worker with a clipboard walks from the health center to a family's nipa house">
      {/* sky, sun, clouds */}
      {/* extra sky above lets the scene crop from the top, not the sides */}
      <rect y="-240" width="640" height="760" fill="#e6eef4" />
      <path d="M200 -40c7-14 30-16 39-4 11-9 30-4 30 11h-77c0-4 3-6 8-7z" fill="#fff" opacity="0.6" />
      <path d="M470 -130c6-12 26-14 34-3 10-8 27-3 27 10h-68c0-4 3-6 7-7z" fill="#fff" opacity="0.5" />
      <circle cx="520" cy="96" r="44" fill="#f3d9a4" />
      <path d="M70 110c8-16 34-18 44-4 12-10 34-4 34 12H62c0-4 3-7 8-8z" fill="#fff" opacity="0.85" />
      <path d="M380 62c6-12 26-14 34-3 10-8 27-3 27 10h-68c0-4 3-6 7-7z" fill="#fff" opacity="0.7" />

      {/* hills */}
      <path d="M0 300c90-46 170-40 250-14s150 10 230-16 120-14 160 0v130H0z" fill="#c7d7c1" />
      <path d="M0 336c120-28 220-12 320 0s210 2 320-14v120H0z" fill="#b3c9ac" />

      {/* ground and footpath */}
      <rect y="392" width="640" height="128" fill="#e8dcc4" />
      <path d="M210 520c40-50 120-80 190-96 60-14 120-20 240-22v26c-110 4-170 12-226 26-64 16-120 40-150 66z" fill="#f1e8d6" />

      {/* purok signpost */}
      <rect x="34" y="342" width="5" height="56" fill={WOOD} />
      <rect x="12" y="324" width="58" height="22" rx="2" fill="#fff" stroke={NAVY} strokeWidth="2" />
      <text x="41" y="339" textAnchor="middle" fontSize="10" fontWeight="700" fill={NAVY} fontFamily="inherit">PUROK 1</text>

      {/* health center */}
      <rect x="84" y="286" width="196" height="108" fill="#fbfaf6" stroke={NAVY} strokeWidth="2" />
      <path d="M70 288 182 238l112 50z" fill={NAVY} />
      <circle cx="182" cy="268" r="11" fill="#fff" />
      <path d="M179 260h6v5h5v6h-5v5h-6v-5h-5v-6h5z" fill={NAVY} />
      <rect x="112" y="296" width="140" height="22" rx="2" fill={NAVY} />
      <text x="182" y="311" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff" letterSpacing="0.5" fontFamily="inherit">BRGY. TAGO HEALTH CENTER</text>
      <rect x="100" y="332" width="40" height="30" fill="#cfe0ec" stroke={NAVY} strokeWidth="2" />
      <path d="M120 332v30M100 347h40" stroke={NAVY} strokeWidth="1.5" />
      <rect x="224" y="332" width="40" height="30" fill="#cfe0ec" stroke={NAVY} strokeWidth="2" />
      <path d="M244 332v30M224 347h40" stroke={NAVY} strokeWidth="1.5" />
      <rect x="164" y="334" width="36" height="60" fill="#93a7ba" stroke={NAVY} strokeWidth="2" />
      <circle cx="194" cy="366" r="2" fill={NAVY} />
      <rect x="156" y="394" width="52" height="6" fill="#d5cbb6" />

      {/* coconut palm */}
      <path d="M318 400c-8-50-6-96 12-140" stroke={WOOD} strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M330 262c-20-14-46-12-62 4 20-4 40 0 62-4z" fill="#6f9a6a" />
      <path d="M330 262c18-18 44-20 62-6-22 0-42 2-62 6z" fill="#6f9a6a" />
      <path d="M330 262c-8-22-2-40 14-50-4 18-8 34-14 50z" fill="#7fa978" />
      <path d="M330 262c-24 2-40 18-42 38 12-16 26-26 42-38z" fill="#5f8a5b" />
      <path d="M330 262c22 4 36 20 36 40-10-16-22-28-36-40z" fill="#5f8a5b" />
      <circle cx="326" cy="268" r="4" fill="#7a5c34" />
      <circle cx="334" cy="270" r="4" fill="#7a5c34" />

      {/* nipa house on stilts */}
      <rect x="400" y="360" width="6" height="40" fill={WOOD} />
      <rect x="500" y="360" width="6" height="40" fill={WOOD} />
      <rect x="390" y="352" width="126" height="10" fill={WOOD} />
      <rect x="396" y="300" width="114" height="52" fill="#dcbd82" stroke={WOOD} strokeWidth="2" />
      <path d="M410 300v52M424 300v52M438 300v52M478 300v52M492 300v52" stroke="#c4a266" strokeWidth="1.5" />
      <path d="M376 304 453 252l77 52z" fill="#b98e4f" />
      <path d="M396 290l57-38M414 292l39-27M492 292l-39-27M510 290l-57-38" stroke="#a37b40" strokeWidth="1.5" />
      <rect x="408" y="312" width="28" height="22" fill="#6b5130" />
      <rect x="452" y="310" width="26" height="42" fill="#7a5c34" />
      <path d="M458 362l-6 38M474 362l6 38M456 374h20M454 388h24" stroke={WOOD} strokeWidth="3" strokeLinecap="round" />
      {/* household number tag */}
      <rect x="486" y="314" width="34" height="16" rx="2" fill="#fff" stroke={NAVY} strokeWidth="1.5" />
      <text x="503" y="325.5" textAnchor="middle" fontSize="8" fontWeight="700" fill={NAVY} fontFamily="inherit">HH-04</text>

      {/* concrete house, right edge */}
      <rect x="556" y="296" width="96" height="102" fill="#f1e4cf" stroke="#4a6580" strokeWidth="2" />
      <path d="M544 298 604 262l60 36z" fill="#4a6580" />
      <rect x="572" y="320" width="30" height="26" fill="#cfe0ec" stroke="#4a6580" strokeWidth="2" />
      <rect x="614" y="340" width="26" height="58" fill="#93a7ba" stroke="#4a6580" strokeWidth="2" />

      {/* chicken */}
      <ellipse cx="548" cy="430" rx="14" ry="10" fill="#fff" stroke="#c9bfae" strokeWidth="1.5" />
      <circle cx="560" cy="420" r="6" fill="#fff" stroke="#c9bfae" strokeWidth="1.5" />
      <path d="M558 413c1-4 5-4 5 0" fill="#c94a3a" />
      <path d="M566 420l5 2-5 2z" fill="#e0a63c" />
      <path d="M544 440v6M552 440v6" stroke="#e0a63c" strokeWidth="2" />

      {/* health worker */}
      <ellipse cx="300" cy="486" rx="36" ry="6" fill="#000" opacity="0.08" />
      <path d="M284 416l-6 64h13l9-50 9 50h13l-6-64z" fill={NAVY} />
      <path d="M276 480h18v6h-20zM306 480h18l2 6h-20z" fill="#2b2b2b" />
      <path d="M278 356c10-8 34-8 44 0l6 64h-56z" fill="#fbfaf6" />
      <path d="M278 356c6-4 10-5 14-5l-2 69h-18zM322 356c-6-4-10-5-14-5l2 69h18z" fill="#4a6580" />
      <path d="M300 352v30" stroke="#c94a3a" strokeWidth="1.5" />
      <rect x="296" y="380" width="9" height="12" rx="1" fill="#fff" stroke={NAVY} strokeWidth="1" />
      <path d="M278 362c-10 16-12 34-6 48" stroke="#a9744f" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M322 362c8 10 14 22 20 34" stroke="#a9744f" strokeWidth="9" fill="none" strokeLinecap="round" />
      <g transform="rotate(-12 344 392)">
        <rect x="330" y="372" width="28" height="36" rx="2" fill="#fff" stroke={NAVY} strokeWidth="2" />
        <rect x="338" y="368" width="12" height="6" rx="1" fill={NAVY} />
        <path d="M335 384h18M335 391h18M335 398h12" stroke="#93a7ba" strokeWidth="2" />
      </g>
      <rect x="294" y="338" width="12" height="12" fill="#a9744f" />
      <circle cx="300" cy="326" r="17" fill="#b5805a" />
      <path d="M283 326c-2-16 8-26 20-25 12 1 18 10 16 22-6-8-16-12-24-10-6 2-10 8-12 13z" fill="#2b211b" />
      <path d="M284 322c-6 8-6 22 0 30 2-10 2-20 0-30z" fill="#2b211b" />
      <circle cx="306" cy="327" r="1.6" fill="#2b211b" />
      <path d="M305 335c2 1 4 1 6-1" stroke="#7a4a30" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
