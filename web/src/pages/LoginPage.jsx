import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert } from '../components/Alert.jsx';
import { showToast } from '../components/Toast.jsx';
import { Button } from '../components/Button.jsx';
import { Input } from '../components/Form.jsx';
import { Card } from '../components/Card.jsx';
import { User, Lock, Eye, EyeOff, ArrowRight, Users, FileText, Shield, Printer } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { key: 'bhw1', user: 'bhw1', pass: 'Demo#12345', label: 'BHW 1', scope: 'Purok 1' },
  { key: 'bhw2', user: 'bhw2', pass: 'Demo#12345', label: 'BHW 2', scope: 'Purok 2 & 3' },
  { key: 'midwife1', user: 'midwife1', pass: 'Demo#12345', label: 'Midwife', scope: 'All puroks (read-only)' },
  { key: 'admin1', user: 'admin1', pass: 'Demo#12345', label: 'Administrator', scope: 'Accounts & puroks' },
];

function HealthMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 4.5h4V10h5.5v4H14v5.5h-4V14H4.5v-4H10V4.5Z" fill="currentColor" />
    </svg>
  );
}

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
      const msg = err instanceof TypeError ? 'Cannot reach the server. Please check your connection.' : err.message || 'Login failed. Please verify your credentials.';
      setError(msg);
      showToast({ type: 'danger', message: msg });
    }
  };

  const quickFill = (acc) => { setUsername(acc.user); setPassword(acc.pass); setActiveKey(acc.key); setError(''); };

  return (
    <div className="login-shell">
      <div className="login-hero">
        <div style={{ maxWidth: '440px', margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2.25rem' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.1)', color: 'var(--teal-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <HealthMark size={18} />
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: 'var(--fs-base)', fontWeight: 700 }}>Barangay Tago</strong>
              <span style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'rgba(255,255,255,0.62)' }}>Health Center · Naga City</span>
            </div>
          </div>

          <p style={{ fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.18, marginBottom: '1.25rem', color: '#fff' }}>
            One record for every household in Barangay Tago.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 'var(--fs-md)', lineHeight: 1.65, marginBottom: '2.25rem', maxWidth: '42ch' }}>
            Household registration, resident masterlists, and program tracking — replacing the paper forms and spreadsheets used at the health center, with an audited record for every resident.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
            {[
              { title: 'Resident profiling', desc: 'Household rosters with maternal health, PWD, and condition tracking.', icon: <Users className="h-[17px] w-[17px]" /> },
              { title: 'Program masterlists', desc: 'Target-group lists for senior citizens, under-five children, pregnant women, and PWD.', icon: <FileText className="h-[17px] w-[17px]" /> },
              { title: 'Print-ready reports', desc: 'Official letterheads with the coverage area, report date, and sign-off lines.', icon: <Printer className="h-[17px] w-[17px]" /> },
              { title: 'Zone security and audit', desc: 'Least-privilege roles; every data change is logged.', icon: <Shield className="h-[17px] w-[17px]" /> },
            ].map((f) => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem' }}>
                <span style={{ color: 'var(--teal-300)', display: 'flex', flexShrink: 0, marginTop: '2px' }}>{f.icon}</span>
                <div>
                  <strong style={{ display: 'block', fontSize: 'var(--fs-sm)', color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>{f.title}</strong>
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'rgba(255,255,255,0.62)', lineHeight: 1.5 }}>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--fs-xs)', marginTop: '2.75rem' }}>Republic of the Philippines · City Government of Naga · MIS 215 Project</div>
        </div>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <Card padding={false}>
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--teal-50)', color: 'var(--teal-700)', border: '1px solid var(--teal-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <HealthMark size={19} />
                </div>
                <div>
                  <h1 style={{ fontSize: 'var(--fs-lg)', fontWeight: 700, color: 'var(--text-heading)', letterSpacing: '-0.015em', lineHeight: 1.3 }}>Barangay Tago Health Center</h1>
                  <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)' }}>Staff sign-in</p>
                </div>
              </div>

              <Alert type="danger" message={error} onClose={() => setError('')} />

              <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-username">Username</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)', display: 'flex' }}><User className="h-4 w-4" /></span>
                    <Input id="login-username" type="text" placeholder="e.g. bhw1, midwife1, admin1" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus autoComplete="username" style={{ paddingLeft: '2.4rem' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-password">Password</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)', display: 'flex' }}><Lock className="h-4 w-4" /></span>
                    <Input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="Enter account password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" style={{ paddingLeft: '2.4rem', paddingRight: '2.6rem' }} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', display: 'flex', padding: '5px' }}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" variant="primary" size="lg" disabled={loading} className="btn-block" style={{ marginTop: '0.5rem' }}>
                  {loading ? 'Signing in…' : (<>Sign in <ArrowRight className="h-4 w-4" /></>)}
                </Button>
              </form>

              <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                <span style={{ display: 'block', fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.6rem' }}>Demo accounts</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button key={acc.key} type="button" onClick={() => quickFill(acc)} aria-label={`Fill credentials for ${acc.label}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: activeKey === acc.key ? '1px solid var(--teal-300)' : '1px solid var(--border)', background: activeKey === acc.key ? 'var(--teal-50)' : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'var(--transition-fast)', minHeight: '40px', fontFamily: 'inherit' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: activeKey === acc.key ? 'var(--teal-800)' : 'var(--text-heading)' }}>{acc.label}</span>
                        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)' }}>{acc.user}</span>
                      </span>
                      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--faint)' }}>{acc.scope}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          <p style={{ textAlign: 'center', fontSize: 'var(--fs-xs)', color: 'var(--muted)', marginTop: '1rem' }}>Access is role-restricted. All data changes are audited.</p>
        </div>
      </div>
    </div>
  );
}
