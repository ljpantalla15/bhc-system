import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, pageSize, total, unit = 'entries', onPageChange }) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  if (totalPages <= 1) return null;

  const startEntry = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endEntry = Math.min(page * pageSize, total);

  const pages = [];
  let start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  start = Math.max(1, end - 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="pager">
      <div><strong>{startEntry}–{endEntry}</strong> of <strong>{total}</strong> {unit}</div>
      <div className="pager-pages">
        <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
        {pages.map((num) => (
          <button key={num} aria-current={num === page ? 'page' : undefined} className={`btn btn-sm ${num === page ? 'btn-page-active' : 'btn-secondary'}`} onClick={() => onPageChange(num)}>{num}</button>
        ))}
        <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
