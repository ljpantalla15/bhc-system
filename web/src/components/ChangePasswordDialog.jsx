import React, { useState } from 'react';
import { Eye, EyeOff, Circle, CircleCheck, CircleX, CheckCircle2, ArrowBigUp } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Modal } from './Modal.jsx';
import { Button } from './Button.jsx';
import { FormGroup, Input } from './Form.jsx';

const ROLE_LABEL = { BHW: 'Health worker', MIDWIFE: 'Midwife', ADMIN: 'Administrator' };

const initials = (name) => {
  const p = (name || '').trim().split(/\s+/).filter(Boolean);
  return (p.length >= 2 ? p[0][0] + p[p.length - 1][0] : (name || 'U').slice(0, 2)).toUpperCase();
};

/* Rough strength: length plus variety. Only a guide; the API checks length. */
const strengthOf = (pw) => {
  if (!pw) return 0;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (pw.length >= 12 && kinds >= 3) return 3;
  if (pw.length >= 8 && kinds >= 2) return 2;
  return 1;
};
const STRENGTH = ['', 'Weak', 'Fair', 'Strong'];

function SecretInput({ id, label, value, onChange, autoComplete, autoFocus, invalid, onCaps }) {
  const [show, setShow] = useState(false);
  const caps = (e) => onCaps?.(Boolean(e.getModifierState && e.getModifierState('CapsLock')));
  return (
    <div className="input-affix has-btn">
      <Input id={id} aria-label={label} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)}
        onKeyUp={caps} onKeyDown={caps} onBlur={() => onCaps?.(false)}
        autoComplete={autoComplete} autoFocus={autoFocus} aria-invalid={invalid || undefined} className={invalid ? 'invalid' : ''} />
      <button type="button" className="affix-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/**
 * Any signed-in user changes their own password (POST /api/auth/password).
 * Their other sessions are signed out; this one stays.
 */
export function ChangePasswordDialog({ isOpen, onClose }) {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [capsOn, setCapsOn] = useState(false);
  const [serverError, setServerError] = useState({});
  const [failMsg, setFailMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null); // { others } after a successful change

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); setCapsOn(false); setServerError({}); setFailMsg(''); setDone(null); };
  const close = () => { reset(); onClose(); };

  /* Each rule: idle until its field has input, then ok or bad as you type. */
  const state = (typed, ok) => (!typed ? 'idle' : ok ? 'ok' : 'bad');
  const rules = [
    { state: state(next.length > 0, next.length >= 8), text: 'At least 8 characters' },
    { state: state(next.length > 0 && current.length > 0, next !== current), text: 'Different from your current password' },
    { state: state(confirm.length > 0, confirm === next), text: 'Both new passwords match' },
  ];
  const ready = current.length > 0 && rules.every((r) => r.state === 'ok');
  const strength = strengthOf(next);

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || saving) return;
    setServerError({});
    setFailMsg('');
    setSaving(true);
    try {
      const res = await api('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      setDone({ others: res?.other_sessions_revoked || 0 });
    } catch (err) {
      const fields = {};
      (err.details || []).forEach((d) => { if (d.field) fields[d.field] = d.issue.replace(/^./, (c) => c.toUpperCase()) + '.'; });
      if (Object.keys(fields).length) setServerError(fields);
      else setFailMsg(err.message || 'The password could not be changed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={close}
        title="Password changed"
        footer={<Button variant="primary" type="button" onClick={close}>Done</Button>}
      >
        <div className="pw-done">
          <CheckCircle2 className="pw-done-icon" aria-hidden="true" />
          <p><strong>Use your new password the next time you sign in.</strong></p>
          <p>
            {done.others > 0
              ? `You were signed out on ${done.others} other ${done.others === 1 ? 'device' : 'devices'}. You are still signed in here.`
              : 'You are still signed in here. No other devices were signed in.'}
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Change password"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form="change-password-form" loading={saving} disabled={!ready}>
            {saving ? 'Saving…' : 'Change password'}
          </Button>
        </>
      }
    >
      <form id="change-password-form" className="pw-form" onSubmit={submit} noValidate>
        {user && (
          <div className="pw-who">
            <span className="avatar-cell" aria-hidden="true">{initials(user.full_name)}</span>
            <div>
              <strong>{user.full_name}</strong>
              <span>{user.username} · {ROLE_LABEL[user.role] || user.role}</span>
            </div>
          </div>
        )}

        {failMsg && <p className="field-error" role="alert">{failMsg}</p>}

        <FormGroup label="Current password" error={serverError.current_password}>
          <SecretInput id="pw-current" label="Current password" value={current} autoFocus autoComplete="current-password" onCaps={setCapsOn}
            invalid={Boolean(serverError.current_password)}
            onChange={(v) => { setCurrent(v); setServerError((s) => ({ ...s, current_password: undefined })); }} />
        </FormGroup>

        <fieldset className="pw-new">
          <legend className="sr-only">Choose a new password</legend>
          <FormGroup label="New password" error={serverError.new_password}>
            <SecretInput id="pw-new" label="New password" value={next} autoComplete="new-password" onCaps={setCapsOn}
              invalid={Boolean(serverError.new_password)}
              onChange={(v) => { setNext(v); setServerError((s) => ({ ...s, new_password: undefined })); }} />
          </FormGroup>
          {next && (
            <div className={`pw-strength s${strength}`} aria-live="polite">
              <span className="pw-bars" aria-hidden="true"><i /><i /><i /></span>
              <span>{STRENGTH[strength]}{strength < 3 ? ': longer, with numbers or symbols, is stronger' : ''}</span>
            </div>
          )}
          <FormGroup label="Type it again">
            <SecretInput id="pw-confirm" label="Type the new password again" value={confirm} autoComplete="new-password" onCaps={setCapsOn} onChange={setConfirm}
              invalid={confirm.length > 0 && confirm.length >= next.length && confirm !== next} />
          </FormGroup>

          <ul className="pw-rules" aria-label="Password requirements">
            {rules.map((r) => (
              <li key={r.text} className={r.state}>
                {r.state === 'ok' ? <CircleCheck className="h-4 w-4" aria-hidden="true" />
                  : r.state === 'bad' ? <CircleX className="h-4 w-4" aria-hidden="true" />
                  : <Circle className="h-4 w-4" aria-hidden="true" />}
                <span>{r.text}</span>
                <span className="sr-only">{r.state === 'ok' ? ' (met)' : r.state === 'bad' ? ' (not met)' : ' (not checked yet)'}</span>
              </li>
            ))}
          </ul>
        </fieldset>

        {capsOn && <p className="pw-caps" role="status"><ArrowBigUp className="h-4 w-4" aria-hidden="true" />Caps Lock is on.</p>}

        <p className="pw-note">You stay signed in here. Any other phone or computer using your account will be signed out.</p>
      </form>
    </Modal>
  );
}
