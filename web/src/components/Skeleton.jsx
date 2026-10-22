import React from 'react';

export function Skeleton({ variant = 'text', className = '', style }) {
  const variants = { text: 'skeleton-text', avatar: 'skeleton-avatar', row: 'skeleton-row' };
  return <div className={`skeleton ${variants[variant] || variants.text} ${className}`} style={style} />;
}

export function SkeletonList({ count = 4, variant = 'row' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant={variant} style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ opacity: 0.6 }}>
      <div className="card-body">
        <Skeleton variant="text" style={{ height: '20px', width: '40%', marginBottom: '1rem' }} />
        <Skeleton variant="text" style={{ height: '18px', width: '70%', marginBottom: '0.75rem' }} />
        <Skeleton variant="text" style={{ height: '18px', width: '50%', marginBottom: '0.75rem' }} />
        <Skeleton variant="text" style={{ height: '16px', width: '60%' }} />
      </div>
    </div>
  );
}
