import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export function Alert({ type = 'info', message, onClose }) {
  if (!message) return null;
  const Icon = type === 'success' ? CheckCircle2 : type === 'danger' ? AlertCircle : type === 'warning' ? AlertTriangle : Info;
  const color = type === 'success' ? 'var(--success-dark)' : type === 'danger' ? 'var(--danger-dark)' : type === 'warning' ? 'var(--warning-dark)' : 'var(--info-dark)';
  return (
    <div className={`alert alert-${type}`} role="alert">
      <Icon className="h-5 w-5 shrink-0" style={{ color }} />
      <div style={{ flex: 1, lineHeight: 1.45, fontWeight: 500 }}>{message}</div>
      {onClose && (
        <button onClick={onClose} type="button" aria-label="Close notification" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'inherit', opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>
          <X className="h-[18px] w-[18px]" />
        </button>
      )}
    </div>
  );
}
