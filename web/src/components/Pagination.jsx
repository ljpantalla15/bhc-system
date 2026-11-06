import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Page numbers to show: always the first and last page, the current page with
 * one neighbour each side, and "…" for the gaps. 1 … 4 5 6 … 12
 */
function pageList(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const set = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((n) => set.add(n));
  const nums = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push(`gap-${n}`);
    out.push(n);
  });
  return out;
}

/**
 * List footer: what is showing, page controls, and (optionally) rows per page.
 * The summary always shows, even when everything fits on one page.
 */
export function Pagination({ page, pageSize, total, unit = 'entries', onPageChange, pageSizeOptions, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const go = (p) => { if (p >= 1 && p <= totalPages && p !== page) onPageChange(p); };

  return (
    <nav className="pager" aria-label="Pages">
      <p className="pager-summary" aria-live="polite">
        Showing <strong>{first}–{last}</strong> of <strong>{total}</strong> {unit}
      </p>

      {totalPages > 1 && (
        <div className="pager-nav">
          <button type="button" className="btn btn-secondary btn-sm pager-step" disabled={page <= 1} onClick={() => go(page - 1)}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /><span>Previous</span>
          </button>
          <ol className="pager-pages">
            {pageList(page, totalPages).map((n) => (typeof n === 'string'
              ? <li key={n} className="pager-gap" aria-hidden="true">…</li>
              : (
                <li key={n}>
                  <button type="button" className={`pager-num ${n === page ? 'is-current' : ''}`} aria-current={n === page ? 'page' : undefined} aria-label={`Page ${n}`} onClick={() => go(n)}>{n}</button>
                </li>
              )))}
          </ol>
          <span className="pager-of">Page {page} of {totalPages}</span>
          <button type="button" className="btn btn-secondary btn-sm pager-step" disabled={page >= totalPages} onClick={() => go(page + 1)}>
            <span>Next</span><ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {pageSizeOptions && onPageSizeChange && (
        <label className="pager-size">
          <span>Per page</span>
          <select className="form-select" value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      )}
    </nav>
  );
}
