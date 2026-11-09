import React from 'react';
import { SkeletonNum } from './Skeleton.jsx';
import { Check } from 'lucide-react';

export function Card({ children, className = '', style, padding = true, header, footer, ...rest }) {
  return (
    <div className={`card ${className}`} style={style} {...rest}>
      {header && <div className="card-header">{header}</div>}
      {padding !== false ? <div className="card-body">{children}</div> : children}
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

/** Inline stats: a number over a label. No tiles, no icons. */
export function KpiStrip({ items, className = '', style }) {
  return (
    <div className={`kpi-strip ${className}`} style={style}>
      {items.map((item) => (
        <div className="kpi-cell" key={item.label}>
          <span className="kpi-label">{item.label}</span>
          <span className="kpi-value">{item.value}</span>
          {item.sub && <span className="kpi-sub">{item.sub}</span>}
        </div>
      ))}
    </div>
  );
}

/**
 * Purok filter: resident counts per purok, and the purok picker in one.
 * A health worker sees only their assigned puroks; the midwife sees all.
 */
export function PurokStrip({ zones, counts, assignedZones = [], loading = false, selected = '', onSelect }) {
  const visible = assignedZones.length ? zones.filter((z) => assignedZones.includes(z.id)) : zones;
  const total = visible.reduce((sum, z) => sum + (counts[z.id] || 0), 0);
  const show = (n) => (loading || n === undefined ? <SkeletonNum /> : n);
  /* One assigned purok: "All my puroks" would repeat it, so show just that purok. */
  const single = assignedZones.length === 1;

  return (
    <div className="purok-filter" role="group" aria-label="Filter by purok">
      {!single && (
        <button type="button" className="purok-btn" aria-pressed={!selected} onClick={() => onSelect('')}>
          <span className="p-name">{assignedZones.length ? 'All my puroks' : 'All puroks'}</span>
          <span className="p-count">{loading ? <SkeletonNum /> : total}</span>
          <span className="p-note">residents</span>
        </button>
      )}
      {visible.map((z) => (
        <button
          key={z.id}
          type="button"
          className="purok-btn"
          aria-pressed={single || String(selected) === String(z.id)}
          onClick={() => onSelect(single ? '' : String(z.id))}
          title={z.description}
        >
          <span className="p-name">{z.name}</span>
          <span className="p-count">{show(counts[z.id])}</span>
          <span className="p-note">{single ? z.description : 'residents'}</span>
        </button>
      ))}
    </div>
  );
}

/** A numbered form section. Numbers are used only because the form is a sequence. */
export function FormSection({ step, done, title, desc, children, aside }) {
  return (
    <section className="form-section">
      <div className="form-section-head">
        <span className={`step-no ${done ? 'done' : ''}`} aria-hidden="true">{done ? <Check size={16} strokeWidth={3} /> : step}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="form-section-title">{title}</h2>
          {desc && <p className="form-section-desc">{desc}</p>}
        </div>
        {aside}
      </div>
      <div className="form-section-body">{children}</div>
    </section>
  );
}

export function SectionCard({ title, desc, children, className = '', style }) {
  return (
    <Card className={className} style={style}>
      <h2 className="card-title">{title}</h2>
      {desc && <p className="form-hint" style={{ marginBottom: '1rem' }}>{desc}</p>}
      {children}
    </Card>
  );
}
