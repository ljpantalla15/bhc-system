import React from 'react';
import { AlertCircle } from 'lucide-react';

const isControl = (c) =>
  React.isValidElement(c) &&
  (c.type === Input || c.type === Select || c.type === 'input' || c.type === 'select' || c.type === 'textarea');

export function FormGroup({ label, required, hint, error, children, className = '', style }) {
  const autoId = React.useId();
  const only = React.Children.count(children) === 1 ? React.Children.toArray(children)[0] : null;
  const control = isControl(only) ? only : null;
  const fieldId = control ? (control.props.id || autoId) : undefined;
  const noteId = fieldId && (error || hint) ? `${fieldId}-note` : undefined;

  let content = children;
  if (control) {
    content = React.cloneElement(control, {
      id: fieldId,
      'aria-describedby': [control.props['aria-describedby'], noteId].filter(Boolean).join(' ') || undefined,
      'aria-invalid': error ? true : control.props['aria-invalid'],
    });
  }

  return (
    <div className={`form-group ${className}`} style={style}>
      {label && <label htmlFor={fieldId} className={`form-label ${required ? 'required' : ''}`}>{label}</label>}
      {content}
      {hint && !error && <span id={noteId} className="form-hint">{hint}</span>}
      {error && <span id={noteId} className="field-error" role="alert"><AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" style={{ marginTop: '1px' }} />{error}</span>}
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

export function Select({ id, value, onChange, placeholder, required, disabled, className = '', style, children, ...rest }) {
  return (
    <select id={id} className={`form-select ${className}`} style={style} value={value} onChange={onChange} required={required} disabled={disabled} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  );
}
