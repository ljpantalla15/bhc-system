import React from 'react';

/**
 * Staff avatar. One hue for every role: the brand tint carries identity,
 * never a per-role colour (which would spend the screen's colour budget).
 */
const ROLE_STYLE = {
  ADMIN: { bg: 'var(--teal-100)', color: 'var(--teal-800)', border: 'var(--teal-200)' },
  MIDWIFE: { bg: 'var(--teal-100)', color: 'var(--teal-800)', border: 'var(--teal-200)' },
  BHW: { bg: 'var(--teal-100)', color: 'var(--teal-800)', border: 'var(--teal-200)' },
};

export function Avatar({ src, initials = 'U', role = 'BHW', size = 'md', status, className = '' }) {
  const sizes = { sm: { w: '28px', h: '28px', fs: '0.72rem' }, md: { w: '34px', h: '34px', fs: '0.82rem' }, lg: { w: '44px', h: '44px', fs: '1rem' } };
  const s = sizes[size];
  const style = ROLE_STYLE[role] || ROLE_STYLE.BHW;
  return (
    <div className={`avatar ${className}`} style={{ position: 'relative', display: 'inline-flex' }}>
      {src ? (
        <img src={src} alt="" style={{ width: s.w, height: s.h, borderRadius: 'var(--radius-full)', objectFit: 'cover', background: style.bg, color: style.color }} />
      ) : (
        <div style={{ width: s.w, height: s.h, borderRadius: 'var(--radius-full)', background: style.bg, color: style.color, border: `1px solid ${style.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: s.fs, letterSpacing: '0.01em' }}>
          {initials}
        </div>
      )}
      {status && (
        <span style={{ position: 'absolute', bottom: '1px', right: '1px', width: '9px', height: '9px', borderRadius: 'var(--radius-full)', background: status === 'online' ? 'var(--positive)' : 'var(--slate-400)', border: '2px solid var(--surface)' }} aria-label={status === 'online' ? 'Online' : 'Offline'} />
      )}
    </div>
  );
}
