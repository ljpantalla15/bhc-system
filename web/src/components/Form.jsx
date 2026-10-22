import React from 'react';
import { AlertCircle } from 'lucide-react';

export function FormGroup({ label, required, hint, error, children, className = '', style }) {
  return (
    <div className={`form-group ${className}`} style={style}>
      {label && <label className={`form-label ${required ? 'required' : ''}`}>{label}</label>}
      {children}
      {hint && !error && <span className="form-hint">{hint}</span>}
      {error && <span className="field-error" role="alert"><AlertCircle className="h-3.5 w-3.5 shrink-0" style={{ marginTop: '1px' }} />{error}</span>}
    </div>
  );
}

export function FormGrid({ children, cols = 2, className = '' }) {
  return <div className={`form-grid form-grid-${cols} ${className}`}>{children}</div>;
}

export function FormCheck({ label, checked, onChange, disabled, className = '', style }) {
  return (
    <label className={`form-check ${className}`} style={style}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <span className="form-check-label">{label}</span>
    </label>
  );
}

export function Input({ id, value, onChange, type = 'text', placeholder, required, disabled, className = '', style, ...rest }) {
  return (
    <input id={id} type={type} className={`form-control ${className}`} style={style} value={value} onChange={onChange} placeholder={placeholder} required={required} disabled={disabled} {...rest} />
  );
}

export function Select({ id, value, onChange, placeholder, required, disabled, className = '', style, children }) {
  return (
    <select id={id} className={`form-select ${className}`} style={style} value={value} onChange={onChange} required={required} disabled={disabled}>
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  );
}
