import React from 'react';

// Original illustration: a health worker on a house visit in Barangay Tago.
// Health center on the left, a nipa house and a concrete house on the right.
const NAVY = '#1e3d59';
const WOOD = '#8a6a3e';

export function LoginIllustration() {
  return (
    <svg className="login-illustration" viewBox="0 -240 640 760" preserveAspectRatio="xMidYMax slice" role="img" aria-label="A barangay health worker with a clipboard walks from the health center to a family's nipa house">
      <defs>
        <linearGradient id="il-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9d0e6" />
          <stop offset="0.55" stopColor="#dbe8f3" />
          <stop offset="1" stopColor="#f6ecd9" />
        </linearGradient>
        <radialGradient id="il-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff3d1" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#f6dba6" stopOpacity="0.45" />
          <stop offset="1" stopColor="#f6dba6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="il-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eadfc6" />
          <stop offset="1" stopColor="#dccfb0" />
        </linearGradient>
        <linearGradient id="il-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3f0f9" />
          <stop offset="1" stopColor="#b9d3e6" />
        </linearGradient>
        <linearGradient id="il-roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a5075" />
          <stop offset="1" stopColor="#1e3d59" />
        </linearGradient>
      </defs>

      {/* sky and sun glow */}
      <rect y="-240" width="640" height="760" fill="url(#il-sky)" />
      <circle cx="520" cy="96" r="120" fill="url(#il-sun)" />
      <circle cx="520" cy="96" r="38" fill="#fbe7b6" />

      {/* drifting clouds */}
      <g className="il-cloud il-cloud-a"><path d="M70 110c8-16 34-18 44-4 12-10 34-4 34 12H62c0-4 3-7 8-8z" fill="#fff" opacity="0.9" /></g>
      <g className="il-cloud il-cloud-b"><path d="M380 62c6-12 26-14 34-3 10-8 27-3 27 10h-68c0-4 3-6 7-7z" fill="#fff" opacity="0.8" /></g>
      <g className="il-cloud il-cloud-c"><path d="M200 -40c7-14 30-16 39-4 11-9 30-4 30 11h-77c0-4 3-6 8-7z" fill="#fff" opacity="0.65" /></g>
      <g className="il-cloud il-cloud-b"><path d="M470 -130c6-12 26-14 34-3 10-8 27-3 27 10h-68c0-4 3-6 7-7z" fill="#fff" opacity="0.5" /></g>

      {/* birds */}
      <g transform="translate(40 70)"><g className="il-birds" fill="none" stroke="#6b829a" strokeWidth="1.6" strokeLinecap="round">
        <path d="M250 150q6-7 12 0q6-7 12 0" />
        <path d="M290 126q5-6 10 0q5-6 10 0" />
        <path d="M232 118q4-5 8 0q4-5 8 0" />
      </g></g>

      {/* hills: lighter and bluer the farther away */}
      <path d="M0 292c90-46 170-40 250-14s150 10 230-16 120-14 160 0v140H0z" fill="#cfdccf" />
      <path d="M0 322c110-30 200-16 300-2s220 4 340-14v120H0z" fill="#bfd2bd" />
      <path d="M0 352c120-24 230-10 330 2s210 0 310-14v100H0z" fill="#aac4a6" />

      {/* ground and footpath */}
      <rect y="392" width="640" height="128" fill="url(#il-ground)" />
      <path d="M210 520c40-50 120-80 190-96 60-14 120-20 240-22v26c-110 4-170 12-226 26-64 16-120 40-150 66z" fill="#f6eedc" />
      <path d="M0 394h640" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" />

      {/* grass tufts and flowers */}
      <g stroke="#7fa978" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M60 440l-3-9M64 440l1-10M68 440l4-8" />
        <path d="M140 470l-3-9M144 470l1-10M148 470l4-8" />
        <path d="M470 456l-3-9M474 456l1-10M478 456l4-8" />
        <path d="M600 480l-3-9M604 480l1-10M608 480l4-8" />
      </g>
      <g>
        <circle cx="100" cy="452" r="3" fill="#e79ab4" /><circle cx="108" cy="458" r="2.5" fill="#f3d27a" />
        <circle cx="420" cy="470" r="3" fill="#f3d27a" /><circle cx="430" cy="476" r="2.5" fill="#e79ab4" />
      </g>

      {/* purok signpost */}
      <rect x="34" y="342" width="5" height="56" rx="2" fill={WOOD} />
      <rect x="12" y="324" width="58" height="22" rx="5" fill="#fff" stroke="#c9d6e2" strokeWidth="1.5" />
      <text x="41" y="339" textAnchor="middle" fontSize="10" fontWeight="700" fill={NAVY} fontFamily="inherit">PUROK 1</text>

      {/* soft ground shadows */}
      <ellipse cx="182" cy="398" rx="122" ry="8" fill="#6b5a3a" opacity="0.16" />
      <ellipse cx="453" cy="404" rx="78" ry="6" fill="#6b5a3a" opacity="0.16" />
      <ellipse cx="606" cy="400" rx="60" ry="6" fill="#6b5a3a" opacity="0.16" />

      {/* health center: flat shapes, shaded right side, no heavy outlines */}
      <rect x="84" y="286" width="196" height="108" rx="3" fill="#fdfcf8" />
      <path d="M232 286h45a3 3 0 0 1 3 3v102a3 3 0 0 1-3 3h-45z" fill="#e9e4d6" />
      <path d="M70 290 182 238l112 52z" fill="url(#il-roof)" />
      <path d="M182 238l112 52h-24L182 249z" fill="#fff" opacity="0.08" />
      <rect x="70" y="288" width="224" height="5" rx="2" fill="#16304a" />
      <circle cx="182" cy="268" r="12" fill="#fff" />
      <path d="M179 260h6v5h5v6h-5v5h-6v-5h-5v-6h5z" fill="#c94a3a" />
      <rect x="112" y="298" width="140" height="22" rx="4" fill={NAVY} />
      <text x="182" y="313" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff" letterSpacing="0.5" fontFamily="inherit">BRGY. TAGO HEALTH CENTER</text>
      <rect x="100" y="332" width="40" height="30" rx="3" fill="url(#il-glass)" />
      <path d="M120 332v30M100 347h40" stroke="#fff" strokeWidth="2" />
      <rect x="100" y="362" width="40" height="4" rx="2" fill="#d5cbb6" />
      <rect x="224" y="332" width="40" height="30" rx="3" fill="url(#il-glass)" />
      <path d="M244 332v30M224 347h40" stroke="#fff" strokeWidth="2" />
      <rect x="224" y="362" width="40" height="4" rx="2" fill="#cfc4ac" />
      <rect x="164" y="334" width="36" height="60" rx="3" fill="#7e97ad" />
      <rect x="168" y="338" width="28" height="24" rx="2" fill="url(#il-glass)" opacity="0.9" />
      <circle cx="194" cy="368" r="2" fill="#f3d27a" />
      <rect x="154" y="394" width="56" height="7" rx="2" fill="#ddd3bd" />
      <ellipse cx="96" cy="396" rx="16" ry="11" fill="#7fa978" />
      <ellipse cx="112" cy="398" rx="12" ry="8" fill="#6f9a6a" />
      <ellipse cx="268" cy="396" rx="16" ry="11" fill="#7fa978" />
      <ellipse cx="252" cy="398" rx="12" ry="8" fill="#6f9a6a" />

      {/* coconut palm */}
      <path d="M318 402c-8-50-6-96 12-140" stroke="#9a7849" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M314 380l8-2M312 356l9-2M314 332l9-2M320 308l9-2M326 286l8-2" stroke="#7a5c34" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <g className="il-sway">
        <path d="M330 262c-22-16-50-14-68 6 22-6 44-4 68-6z" fill="#6f9a6a" />
        <path d="M330 262c20-20 48-22 68-6-24 0-46 2-68 6z" fill="#7fa978" />
        <path d="M330 262c-8-24-2-42 14-52-4 18-8 36-14 52z" fill="#8fb888" />
        <path d="M330 262c-26 2-44 20-46 42 14-18 28-28 46-42z" fill="#5f8a5b" />
        <path d="M330 262c24 4 40 22 40 44-10-18-24-30-40-44z" fill="#5f8a5b" />
        <circle cx="326" cy="270" r="4.5" fill="#7a5c34" />
        <circle cx="335" cy="272" r="4.5" fill="#6b4e2b" />
      </g>

      {/* nipa house on stilts */}
      <rect x="400" y="360" width="6" height="42" rx="2" fill={WOOD} />
      <rect x="500" y="360" width="6" height="42" rx="2" fill={WOOD} />
      <rect x="390" y="352" width="126" height="10" rx="2" fill="#7a5c34" />
      <rect x="396" y="300" width="114" height="52" rx="2" fill="#e3c88f" />
      <path d="M470 300h38a2 2 0 0 1 2 2v48a2 2 0 0 1-2 2h-38z" fill="#d4b374" />
      <path d="M410 300v52M424 300v52M438 300v52M492 300v52" stroke="#c9aa6c" strokeWidth="1.5" />
      <path d="M374 306 453 252l79 54z" fill="#c39a58" />
      <path d="M453 252l79 54h-26L453 265z" fill="#a37b40" opacity="0.5" />
      <path d="M392 296l61-40M412 300l41-30M494 300l-41-30M514 296l-61-40" stroke="#a37b40" strokeWidth="1.5" opacity="0.8" />
      <rect x="408" y="312" width="28" height="22" rx="2" fill="#5b4328" />
      <rect x="411" y="315" width="22" height="16" rx="1" fill="#f3d9a4" opacity="0.55" />
      <rect x="452" y="310" width="26" height="42" rx="2" fill="#7a5c34" />
      <path d="M458 362l-6 40M474 362l6 40M456 376h20M454 390h24" stroke={WOOD} strokeWidth="3" strokeLinecap="round" />
      <rect x="486" y="314" width="34" height="16" rx="3" fill="#fff" />
      <text x="503" y="325.5" textAnchor="middle" fontSize="8" fontWeight="700" fill={NAVY} fontFamily="inherit">HH-04</text>
      <path d="M392 402c-2-14 0-26 6-36" stroke="#7fa978" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M398 368c-14-6-24 0-28 10 12-2 20-4 28-10zM398 368c12-8 24-4 28 4-12 0-20 2-28-4z" fill="#8fb888" />

      {/* concrete house, right edge */}
      <rect x="556" y="296" width="96" height="104" rx="3" fill="#f4e8d4" />
      <path d="M556 296h24v104h-24z" fill="#fff" opacity="0.35" />
      <path d="M544 300 604 262l60 38z" fill="#5b7894" />
      <path d="M604 262l60 38h-20L604 273z" fill="#fff" opacity="0.1" />
      <rect x="572" y="320" width="30" height="26" rx="3" fill="url(#il-glass)" />
      <path d="M587 320v26M572 333h30" stroke="#fff" strokeWidth="2" />
      <rect x="614" y="340" width="26" height="60" rx="3" fill="#7e97ad" />

      {/* chicken */}
      <ellipse cx="548" cy="448" rx="16" ry="3.5" fill="#6b5a3a" opacity="0.14" />
      <ellipse cx="548" cy="430" rx="14" ry="10" fill="#fff" />
      <path d="M538 428c4 6 12 8 20 2-2 6-8 10-16 8z" fill="#eee7d9" />
      <circle cx="560" cy="420" r="6" fill="#fff" />
      <path d="M558 413c1-4 5-4 5 0z" fill="#c94a3a" />
      <path d="M566 420l5 2-5 2z" fill="#e0a63c" />
      <circle cx="562" cy="419" r="1" fill="#2b211b" />
      <path d="M544 440v6M552 440v6" stroke="#e0a63c" strokeWidth="2" strokeLinecap="round" />

      {/* health worker: mid-stride, uniform vest, lanyard, clipboard */}
      <g className="il-person">
        <ellipse cx="302" cy="489" rx="40" ry="6" fill="#000" opacity="0.13" />

        {/* back leg */}
        <path d="M286 420h15l-5 58h-14z" fill="#16304a" />
        <path d="M279 477h16a3 3 0 0 1 3 3v6h-23v-5a4 4 0 0 1 4-4z" fill="#2b2b2b" />
        <path d="M276 486h22" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
        {/* front leg, stepping forward */}
        <path d="M299 420h15l11 54h-14z" fill={NAVY} />
        <path d="M309 470h15l7 8 3 8h-24z" fill="#2b2b2b" />
        <path d="M309 486h25" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />

        {/* torso: white blouse, navy vest */}
        <path d="M278 364c4-8 13-12 22-12s18 4 22 12l5 60H273z" fill="#fdfcf8" />
        <path d="M312 354c6 2 11 6 12 11l4 59h-14z" fill="#e9e4d6" />
        <path d="M278 364c3-6 8-9 14-11l-2 71h-18zM322 364c-3-6-8-9-14-11l2 71h18z" fill="#4a6580" />
        <path d="M278 364c3-6 8-9 14-11l-1 14c-5 2-9 5-12 9z" fill="#fff" opacity="0.12" />
        <path d="M273 424h54v6a3 3 0 0 1-3 3h-48a3 3 0 0 1-3-3z" fill="#16304a" />
        {/* lanyard and ID card */}
        <path d="M293 353l7 28 7-28" fill="none" stroke="#c94a3a" strokeWidth="2" strokeLinejoin="round" />
        <rect x="294" y="380" width="12" height="15" rx="2.5" fill="#fff" stroke="#93a7ba" strokeWidth="1" />
        <circle cx="300" cy="386" r="2.6" fill="#c28c63" />
        <path d="M296.5 391.5h7" stroke="#93a7ba" strokeWidth="1.6" strokeLinecap="round" />
        {/* vest pocket and pen */}
        <rect x="279" y="396" width="11" height="12" rx="2" fill="#3b5670" />
        <path d="M283 396v-5" stroke="#c94a3a" strokeWidth="2" strokeLinecap="round" />

        {/* far arm, hanging */}
        <path d="M279 364c-4 4-6 10-7 17" stroke="#fdfcf8" strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d="M272 380c-3 12-3 22-1 32" stroke="#b5805a" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="271" cy="414" r="5" fill="#b5805a" />

        {/* clipboard */}
        <g transform="rotate(-10 346 392)">
          <rect x="331" y="370" width="30" height="38" rx="3.5" fill="#fff" stroke="#c9d6e2" strokeWidth="1.5" />
          <rect x="339" y="366" width="14" height="7" rx="2.5" fill={NAVY} />
          <path d="M337 382h18M337 389h18M337 396h11" stroke="#93a7ba" strokeWidth="2" strokeLinecap="round" />
          <path d="M337 382l2 2 3-4" fill="none" stroke="#4e8a5c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        {/* near arm, bent to hold the clipboard */}
        <path d="M321 364c5 4 8 10 10 16" stroke="#fdfcf8" strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d="M331 380c4 7 8 13 13 17" stroke="#c28c63" strokeWidth="8" fill="none" strokeLinecap="round" />
        <circle cx="346" cy="399" r="5" fill="#c28c63" />
        <path d="M344 394l4 8" stroke="#a9744f" strokeWidth="1.2" strokeLinecap="round" />

        {/* neck and head */}
        <path d="M294 338h12v14c-3 3-9 3-12 0z" fill="#a9744f" />
        <circle cx="283" cy="328" r="3.6" fill="#b5805a" />
        <circle cx="317" cy="328" r="3.6" fill="#b5805a" />
        <circle cx="300" cy="326" r="17.5" fill="#c28c63" />
        <path d="M285 333c4 9 14 14 24 12-8 2-19-1-24-12z" fill="#b5805a" opacity="0.5" />
        {/* hair: cap, fringe and a low bun */}
        <circle cx="285" cy="309" r="8" fill="#2b211b" />
        <path d="M282 328c-3-18 8-29 20-28 12 1 18 10 17 22-6-9-15-13-23-10-6 2-11 8-14 16z" fill="#2b211b" />
        <path d="M290 311c6-4 14-3 20 2" fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="2" strokeLinecap="round" />
        {/* face */}
        <path d="M296 318c2-1.5 4-1.5 6 0M308 318c2-1.5 4-1.5 6 0" fill="none" stroke="#2b211b" strokeWidth="1.5" strokeLinecap="round" />
        <ellipse cx="300" cy="326" rx="1.8" ry="2.2" fill="#2b211b" />
        <ellipse cx="311" cy="326" rx="1.8" ry="2.2" fill="#2b211b" />
        <circle cx="300.6" cy="325.2" r="0.6" fill="#fff" />
        <circle cx="311.6" cy="325.2" r="0.6" fill="#fff" />
        <path d="M306 328c-1 3-1 4 1 4" fill="none" stroke="#a9744f" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="295" cy="333" r="3" fill="#e79a86" opacity="0.4" />
        <circle cx="316" cy="333" r="3" fill="#e79a86" opacity="0.4" />
        <path d="M302 336c2.5 3 6.5 3 9 0" fill="none" stroke="#7a4a30" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}
