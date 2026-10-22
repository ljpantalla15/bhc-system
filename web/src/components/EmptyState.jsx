import React from 'react';

/**
 * Empty state — the frame stays, one sentence explains, one action offered.
 * No illustration disc, no decorative icon.
 */
export function EmptyState({ title = 'No data found', description = 'There are no records matching your criteria.', action, actionLabel, className = '' }) {
  return (
    <div className={`empty-state ${className}`} role="status" aria-label={title}>
      <h3 className="empty-title">{title}</h3>
      {description && <p className="empty-desc">{description}</p>}
      {action && actionLabel && (<button type="button" className="btn btn-secondary" onClick={action}>{actionLabel}</button>)}
    </div>
  );
}
