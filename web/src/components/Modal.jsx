import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const openStack = []; // topmost modal last, so Escape/Tab only affect it

export function Modal({ isOpen, onClose, title, subtitle, children, footer, isLarge = false }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const token = {};
    openStack.push(token);
    const opener = document.activeElement;
    document.body.style.overflow = 'hidden';

    const dialog = dialogRef.current;
    const first = dialog?.querySelector('.modal-body ' + FOCUSABLE.split(',').join(',.modal-body '));
    (first || dialog)?.focus();

    const onKey = (e) => {
      if (openStack[openStack.length - 1] !== token) return;
      if (e.key === 'Escape') { onCloseRef.current(); return; }
      if (e.key !== 'Tab' || !dialog) return;
      const items = [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) { e.preventDefault(); dialog.focus(); return; }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === firstEl || document.activeElement === dialog)) {
        e.preventDefault(); lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault(); firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openStack.splice(openStack.indexOf(token), 1);
      if (!openStack.length) document.body.style.overflow = '';
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // A backdrop click closes read-only dialogs only; dialogs with fields would lose typed data.
  const onBackdrop = (e) => {
    if (e.target !== e.currentTarget) return;
    if (dialogRef.current?.querySelector('.modal-body input, .modal-body select, .modal-body textarea')) return;
    onClose();
  };

  // Rendered in a portal on <body>: an animated (transformed) ancestor would
  // otherwise become the containing block for this fixed overlay, so the
  // backdrop would not cover the viewport.
  return createPortal(
    <div className="modal-backdrop" onMouseDown={onBackdrop}>
      <div ref={dialogRef} className={`modal ${isLarge ? 'modal-lg' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="modal-header">
          <div style={{ maxWidth: 'calc(100% - 44px)' }}>
            <div id={titleId} className="modal-title">{title}</div>
            {subtitle && <div className="modal-subtitle">{subtitle}</div>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            <X className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
