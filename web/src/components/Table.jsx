import React from 'react';

export function Table({ columns, rows, className = '', rowKey = 'id' }) {
  return (
    <div className={`table-wrap ${className}`}>
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (<th key={col.key} style={{ width: col.width }}>{col.label}</th>))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((col) => (<td key={col.key}>{typeof col.render === 'function' ? col.render(row) : row[col.key]}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
