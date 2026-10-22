import React from 'react';
import { ChevronRight } from 'lucide-react';

export function Breadcrumb({ items }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {item.href && !isLast ? (
              <a href={item.href} onClick={(e) => { if (item.onClick) item.onClick(e); }}>{item.label}</a>
            ) : (
              <span>{item.label}</span>
            )}
            {!isLast && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
