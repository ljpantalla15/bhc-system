import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = { success: CheckCircle2, danger: AlertCircle, warning: AlertTriangle, info: Info };

export function Alert({ type = 'info', message, onClose }) {
  if (!message) return null;
  const Icon = ICONS[type] || Info;
  return (
    <div className={`alert alert-${type}`} role="alert">
      <Icon className="h-5 w-5 shrink-0" />
      <div style={{ flex: 1, fontWeight: 600 }}>{message}</div>
      {onClose && (
        <button onClick={onClose} type="button" aria-label="Dismiss" className="alert-close"><X className="h-[18px] w-[18px]" /></button>
      )}
    </div>
  );
}
