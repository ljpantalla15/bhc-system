import React from 'react';
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
 * Puroks outside a BHW's assignment are shown but cannot be picked.
 */
export function PurokStrip({ zones, counts, assignedZones = [], loading = false, selected = '', onSelect }) {
  const inScope = (z) => assignedZones.length === 0 || assignedZones.includes(z.id);
  const total = zones.filter(inScope).reduce((sum, z) => sum + (counts[z.id] || 0), 0);
  const show = (n) => (loading || n === undefined ? '–' : n);

  return (
    <div className="purok-filter" role="group" aria-label="Filter by purok">
      <button type="button" className="purok-btn" aria-pressed={!selected} onClick={() => onSelect('')}>
        <span className="p-name">{assignedZones.length ? 'All my puroks' : 'All puroks'}</span>
        <span className="p-count">{loading ? '–' : total}</span>
        <span className="p-note">residents</span>
      </button>
      {zones.map((z) => {
        const ok = inScope(z);
        return (
          <button key={z.id} type="button" className="purok-btn" disabled={!ok} aria-pressed={String(selected) === String(z.id)} onClick={() => onSelect(String(z.id))} title={z.description}>
            <span className="p-name">{z.name}</span>
            <span className="p-count">{ok ? show(counts[z.id]) : '–'}</span>
            <span className="p-note">{ok ? 'residents' : 'not assigned'}</span>
          </button>
        );
      })}
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
