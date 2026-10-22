import React from 'react';
import { Check } from 'lucide-react';

export function Stepper({ children, className = '' }) {
  const steps = React.Children.toArray(children).filter((c) => React.isValidElement(c));
  return (
    <div className={`stepper ${className}`} role="list">
      {steps.map((child, index) => {
        const isLast = index === steps.length - 1;
        return React.cloneElement(child, { stepNumber: index + 1, isLast, total: steps.length });
      })}
    </div>
  );
}

export function Step({ label, subtitle, active = false, completed = false, stepNumber, isLast }) {
  return (
    <div className={`step ${completed ? 'completed' : ''} ${active ? 'active' : ''}`} role="listitem" aria-current={active ? 'step' : undefined}>
      <div className="step-label">
        {completed && <Check aria-hidden="true" />}
        <strong>{label}</strong>
        {subtitle && <span className="step-sub">{subtitle}</span>}
      </div>
    </div>
  );
}
