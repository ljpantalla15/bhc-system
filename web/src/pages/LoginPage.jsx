import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert } from '../components/Alert.jsx';
import { showToast } from '../components/Toast.jsx';
import { Button } from '../components/Button.jsx';
import { Input } from '../components/Form.jsx';
import { HealthMark } from '../components/Layout.jsx';
import { LoginIllustration } from '../components/LoginIllustration.jsx';
import { PrivacyNoticeDialog } from '../components/PrivacyNotice.jsx';

export function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(username, password);
      showToast({ type: 'success', message: `Signed in as ${user.full_name}.` });
      navigate(user.role === 'ADMIN' ? '/users' : '/');
    } catch (err) {
      const msg = err instanceof TypeError ? 'Cannot reach the server. Check your connection and try again.' : err.message || 'Sign-in failed. Check your username and password.';
      setError(msg);
    }
  };

  return (
    <div className="login-page">
      <aside className="login-art">
        <header className="login-masthead">
          <span className="login-seal"><HealthMark size={24} /></span>
          <div>
            <strong>Barangay Tago Health Center</strong>
            <span>Naga City</span>
          </div>
        </header>
        <figure>
          <LoginIllustration />
          <figcaption>House to house, purok by purok. Each visit updates the family profile and the program masterlists.</figcaption>
        </figure>
      </aside>

      <main className="login-main">
        <div className="login-form">
          <p className="login-system">Resident Profiling and Masterlist System</p>
          <h1>Marhay na aldaw!</h1>
          <p className="login-sub">Sign in with your health center staff account.</p>

          <Alert type="danger" message={error} onClose={() => setError('')} />

          <form onSubmit={handleSubmit} className="login-fields">
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">Username</label>
              <Input id="login-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus autoComplete="username" />
            </div>
            <div className="form-group">
              <div className="login-label-row">
                <label className="form-label" htmlFor="login-password">Password</label>
                <button type="button" className="login-reveal" onClick={() => setShowPassword(!showPassword)} aria-controls="login-password">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <Input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button type="submit" variant="primary" size="lg" loading={loading} className="btn-block">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="login-foot">
            MIS 215 academic project. Fictional health center, synthetic data only. Every change is logged under your name.{' '}
            By signing in you agree to handle resident data according to the{' '}
            <button type="button" className="link-btn" onClick={() => setPrivacyOpen(true)}>data privacy notice</button>.
          </p>
          <PrivacyNoticeDialog isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
        </div>
      </main>
    </div>
  );
}
