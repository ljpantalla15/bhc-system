import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const AUTO_DISMISS = 2500;
const MAX_TOASTS = 3;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((type, message, duration = AUTO_DISMISS) => {
    if (!message) return null;
    setToasts((prev) => {
      if (prev.some((t) => t.type === type && t.message === message)) return prev;
      const next = [...prev, { id: Date.now() + Math.random(), type, message, duration }];
      return next.slice(-MAX_TOASTS);
    });
    return null;
  }, []);

  const remove = useCallback((id) => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, []);

  useEffect(() => {
    const onToast = (e) => { const { type, message, duration } = e.detail || {}; add(type, message, duration); };
    window.addEventListener('bhc_toast', onToast);
    return () => window.removeEventListener('bhc_toast', onToast);
  }, [add]);

  useEffect(() => {
    const timers = toasts.map((t) => t.duration > 0 ? setTimeout(() => remove(t.id), t.duration) : null);
    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [toasts, remove]);

  const iconMap = { success: CheckCircle2, danger: AlertCircle, warning: AlertTriangle, info: Info };

  return (
    <>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications">
        {toasts.map((t) => {
          const Icon = iconMap[t.type] || Info;
          return (
            <div key={t.id} className={`toast toast-${t.type}`} role="alert" aria-live="polite">
              <span className="toast-icon">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="toast-body">{t.message}</div>
              <button type="button" className="toast-dismiss" onClick={() => remove(t.id)} aria-label="Dismiss">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function showToast({ type = 'info', message, duration = AUTO_DISMISS } = {}) {
  window.dispatchEvent(new CustomEvent('bhc_toast', { detail: { type, message, duration } }));
}
