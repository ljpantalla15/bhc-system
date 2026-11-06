import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert } from '../components/Alert.jsx';
import { showToast } from '../components/Toast.jsx';
import { Button } from '../components/Button.jsx';
import { Input } from '../components/Form.jsx';
import { HealthMark } from '../components/Layout.jsx';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { key: 'bhw1', user: 'bhw1', pass: 'Demo#12345', label: 'Health worker 1', scope: 'Purok 1' },
  { key: 'bhw2', user: 'bhw2', pass: 'Demo#12345', label: 'Health worker 2', scope: 'Purok 2 and 3' },
  { key: 'midwife1', user: 'midwife1', pass: 'Demo#12345', label: 'Midwife', scope: 'All puroks, read only' },
  { key: 'admin1', user: 'admin1', pass: 'Demo#12345', label: 'Administrator', scope: 'Staff accounts' },
];

export function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [activeKey, setActiveKey] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(username, password);
      showToast({ type: 'success', message: `Signed in as ${user.full_name}.` });
      if (user.role === 'ADMIN') navigate('/users');
      else if (user.role === 'BHW') navigate('/households/new');
      else navigate('/residents');
    } catch (err) {
      const msg = err instanceof TypeError ? 'Cannot reach the server. Check your connection and try again.' : err.message || 'Sign-in failed. Check your username and password.';
      setError(msg);
    }
  };

  const quickFill = (acc) => { setUsername(acc.user); setPassword(acc.pass); setActiveKey(acc.key); setError(''); };

  return (
    <div className="login-shell">
      <div className="login-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <span className="brand-mark"><HealthMark size={20} /></span>
          <span className="brand-text"><strong>Barangay Tago Health Center</strong><span>Naga City</span></span>
        </div>

        <div>
          <p className="login-headline">Every household, one folder.</p>
          <p className="login-lede">Encode family profiles, find residents by purok, and print the target lists for each health program.</p>
        </div>

        <div className="folder-band" aria-hidden="true">
          <div>Senior citizens</div>
          <div>Under-five</div>
          <div>Pregnant women</div>
          <div>Persons with disability</div>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <div>
            <h1>Sign in</h1>
            <p className="sub">Use your health center staff account.</p>
          </div>

          <Alert type="danger" message={error} onClose={() => setError('')} />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">Username</label>
              <div className="input-affix">
                <span className="affix-icon"><User className="h-4 w-4" /></span>
                <Input id="login-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus autoComplete="username" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="input-affix has-btn">
                <span className="affix-icon"><Lock className="h-4 w-4" /></span>
                <Input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                <button type="button" className="affix-btn" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="primary" size="lg" loading={loading} className="btn-block">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div>
            <p className="form-label">Demo accounts</p>
            <div className="demo-list">
              {DEMO_ACCOUNTS.map((acc) => (
                <button key={acc.key} type="button" className="demo-row" onClick={() => quickFill(acc)} aria-pressed={activeKey === acc.key} aria-label={`Fill in ${acc.label}`}>
                  <span><strong>{acc.label}</strong><code>{acc.user}</code></span>
                  <span className="scope">{acc.scope}</span>
                </button>
              ))}
            </div>
            <p className="form-hint">Synthetic data only. Every change is recorded in the audit log.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
