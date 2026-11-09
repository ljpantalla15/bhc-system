import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Skeleton } from './Skeleton.jsx';
import { fieldLabel, QUIET_FIELDS } from '../constants.js';

const fmtWhen = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`;
};

/* "changed Occupation, Pregnancy" */
function what(entry) {
  /* Medical conditions live in their own table: a row added or removed there is a condition, not a record. */
  if (entry.changed_fields.length === 1 && entry.changed_fields[0] === 'medical_conditions') {
    if (entry.action === 'CREATE') return 'added a medical condition';
    if (entry.action === 'DELETE') return 'removed a medical condition';
    return 'changed a medical condition';
  }
  switch (entry.action) {
    case 'CREATE': return 'added this record';
    case 'DEACTIVATE': return 'archived this resident';
    case 'REACTIVATE': return 'restored this resident';
    case 'DELETE': return 'removed this record';
    default: {
      const shown = entry.changed_fields.filter((f) => !QUIET_FIELDS.has(f));
      const fields = shown.length > 0 ? shown : entry.changed_fields;
      return fields.length > 0 ? `changed ${fields.map(fieldLabel).join(', ')}` : 'saved this record';
    }
  }
}

/**
 * Who changed this resident's record, and when. Newest first.
 * Shows field names only; the API never returns the old or new values.
 */
export function ResidentHistory({ residentId }) {
  const [state, setState] = useState({ loading: true, items: [], total: 0, error: '' });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, items: [], total: 0, error: '' });
    api(`/api/residents/${residentId}/history?page_size=20`)
      .then((data) => { if (!cancelled) setState({ loading: false, items: data.items || [], total: data.total || 0, error: '' }); })
      .catch(() => { if (!cancelled) setState({ loading: false, items: [], total: 0, error: 'The change history could not be loaded.' }); });
    return () => { cancelled = true; };
  }, [residentId]);

  return (
    <section className="sheet-section" aria-labelledby="resident-history-title">
      <h3 id="resident-history-title">Change history</h3>
      {state.loading ? (
        <div className="history-skeleton" role="status" aria-label="Loading change history">
          <Skeleton variant="text" style={{ width: '70%' }} />
          <Skeleton variant="text" style={{ width: '55%' }} />
          <Skeleton variant="text" style={{ width: '62%' }} />
        </div>
      ) : state.error ? (
        <p className="muted">{state.error}</p>
      ) : state.items.length === 0 ? (
        <p className="muted">No changes recorded.</p>
      ) : (
        <>
          <ol className="history-list">
            {state.items.map((e) => (
              <li key={e.id}>
                <span className="history-when">{fmtWhen(e.changed_at)}</span>
                <span className="history-what"><strong>{e.changed_by_name || 'The system'}</strong> {what(e)}</span>
              </li>
            ))}
          </ol>
          {state.total > state.items.length && (
            <p className="muted history-more">Showing the latest {state.items.length} of {state.total} changes.</p>
          )}
        </>
      )}
    </section>
  );
}
