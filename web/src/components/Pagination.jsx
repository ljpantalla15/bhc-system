import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, pageSize, total, unit = 'entries', onPageChange }) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  if (totalPages <= 1) return null;

  const startEntry = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endEntry = Math.min(page * pageSize, total);

  const getPages = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border)', background: 'var(--slate-50)', flexWrap: 'wrap', gap: '0.6rem' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>
        Showing <strong>{startEntry}</strong> to <strong>{endEntry}</strong> of <strong>{total}</strong> {unit}
      </div>
      <div className="btn-group" style={{ gap: '0.35rem' }}>
        <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} title="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" /><span>Prev</span>
        </button>
        {getPages().map((num) => (
          <button key={num} aria-current={num === page ? 'page' : undefined} className={`btn btn-sm ${num === page ? 'btn-page-active' : 'btn-secondary'}`} onClick={() => onPageChange(num)} style={{ minWidth: '32px', padding: '0.35rem 0.6rem' }}>
            {num}
          </button>
        ))}
        <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} title="Next page">
          <span>Next</span><ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
