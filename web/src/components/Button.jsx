import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils.js';

export function Button({ children, variant = 'primary', size = 'md', disabled = false, loading = false, onClick, type = 'button', className = '', iconLeft, iconRight, ...rest }) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  return (
    <button type={type} className={`btn btn-${variant} ${sizeClass} ${className}`} disabled={disabled || loading} onClick={onClick} {...rest}>
      {loading && <Loader2 className={`${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} animate-spin`} />}
      {iconLeft && !loading && <span className="shrink-0">{iconLeft}</span>}
      {children}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
}

export function IconButton({ icon, variant = 'ghost', size = 'md', onClick, disabled, title, className = '', ...rest }) {
  const sizes = { sm: 'btn-sm btn-icon', md: 'btn-icon', lg: 'btn-icon btn-icon-lg' };
  return (
    <button type="button" className={`btn btn-${variant} ${sizes[size] || 'btn-icon'} ${className}`} onClick={onClick} disabled={disabled} title={title} aria-label={title} {...rest}>
      {icon}
    </button>
  );
}
