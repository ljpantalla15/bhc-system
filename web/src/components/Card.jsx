import React from 'react';

export function Card({ children, className = '', style, padding = true, header, footer, ...rest }) {
  return (
    <div className={`card ${className}`} style={style} {...rest}>
      {header && <div className="card-header">{header}</div>}
      {padding !== false ? <div className="card-body">{children}</div> : children}
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

/**
 * KPI strip — one container split by 1px dividers.
 * A KPI is a label and a number: no tinted tile, no icon, no sparkline.
 */
export function KpiStrip({ items, className = '', style }) {
  return (
    <div className={`kpi-strip ${className}`} style={style}>
      {items.map((item) => (
        <div className="kpi-cell" key={item.label}>
          <span className="kpi-label">{item.label}</span>
          <span className={`kpi-value ${item.small ? 'sm' : ''}`}>{item.value}</span>
          {item.sub && <span className="kpi-sub">{item.sub}</span>}
        </div>
      ))}
    </div>
  );
}

/**
 * Purok coverage strip — the product's signature element.
 * The barangay is split into puroks; a worker's access is scoped by purok,
 * so the strip shows where residents are registered and where the account
 * cannot see.
 */
export function PurokStrip({ title = 'Coverage by purok', note, zones, counts, assignedZones = [], loading = false }) {
  const visible = zones.filter((z) => assignedZones.length === 0 || assignedZones.includes(z.id));
  const total = visible.reduce((sum, z) => sum + (counts[z.id] || 0), 0);
  const mine = assignedZones.length > 0;

  return (
    <section className="purok-strip" aria-label={title}>
      <div className="purok-strip-head">
        <h2 className="purok-strip-title">{title}</h2>
        <span className="purok-strip-note">
          {loading
            ? 'Loading counts…'
            : mine
              ? `${total} registered resident${total === 1 ? '' : 's'} in your assigned purok${assignedZones.length > 1 ? 's' : ''}`
              : `${total} registered residents across ${visible.length} puroks`}
          {!loading && mine && <span className="purok-strip-sub">Puroks outside your assignment are not visible.</span>}
        </span>
      </div>
      <div className="purok-cells">
        {zones.map((z) => {
          const inScope = assignedZones.length === 0 || assignedZones.includes(z.id);
          const count = counts[z.id];
          return (
            <div className={`purok-cell ${inScope ? 'mine' : ''}`} key={z.id}>
              <span className="purok-cell-name">
                {z.name}
                {inScope && mine && <span className="purok-cell-tag">assigned</span>}
              </span>
              <span className={`purok-cell-count ${!inScope || count === undefined ? 'dim' : ''}`}>
                {inScope ? (count === undefined ? '—' : count) : '—'}
              </span>
              <span className="purok-cell-tag">{inScope ? 'residents registered' : 'not visible'}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SectionCard({ title, desc, icon, children, className = '', style }) {
  return (
    <Card className={`section-card ${className}`} style={style}>
      <div className="section-head">
        {icon && <span style={{ display: 'flex', color: 'var(--accent)' }}>{icon}</span>}
        <div>
          <h2 className="section-title">{title}</h2>
          {desc && <div className="section-desc">{desc}</div>}
        </div>
      </div>
      {children}
    </Card>
  );
}
