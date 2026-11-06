import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Home, Users, FileText, Shield, LogOut, MapPin, ChevronDown, UserPlus, KeyRound } from 'lucide-react';
import { ChangePasswordDialog } from './ChangePasswordDialog.jsx';

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

/** The health center's mark: a cross. */
export function HealthMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 4.5h4V10h5.5v4H14v5.5h-4V14H4.5v-4H10V4.5Z" fill="currentColor" />
    </svg>
  );
}

const navItems = (role) => {
  if (role === 'BHW') return [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/households/new', label: 'Encode household', short: 'Encode', icon: UserPlus },
    { to: '/residents', label: 'Residents', icon: Users },
    { to: '/masterlists', label: 'Masterlists', icon: FileText },
  ];
  if (role === 'MIDWIFE') return [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/residents', label: 'Residents', icon: Users },
    { to: '/masterlists', label: 'Masterlists', icon: FileText },
  ];
  if (role === 'ADMIN') return [{ to: '/users', label: 'Staff accounts', short: 'Staff', icon: Shield }];
  return [];
};

const scopeLabel = (user) => {
  if (user.role === 'BHW') {
    const zones = user.zone_ids || [];
    return zones.length > 0 ? `Purok ${zones.join(', ')}` : 'No purok assigned';
  }
  if (user.role === 'MIDWIFE') return 'All puroks, read only';
  return 'Accounts only';
};

const roleLabel = (role) => ({ BHW: 'Barangay health worker', MIDWIFE: 'Midwife', ADMIN: 'Administrator' }[role] || role);

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const menuRef = useRef(null);
  const handleLogout = async () => { setMenuOpen(false); await logout(); navigate('/login'); };

  /* New page: start at the top and close the account menu. */
  useEffect(() => { window.scrollTo(0, 0); setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  if (!user) return null;
  const items = navItems(user.role);

  return (
    <div className={`app ${items.length > 1 ? 'has-tabbar' : ''}`}>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand" aria-label="Barangay Tago Health Center, home">
            <span className="brand-mark"><HealthMark size={18} /></span>
            <span className="brand-text"><strong>Tago Health Center</strong><span>Naga City</span></span>
          </NavLink>

          {/* Desktop: tabs in the top bar. Phones: a bottom tab bar (same links). */}
          <nav className="topnav" aria-label="Main">
            {items.map(({ to, label, short, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} aria-label={label} className={({ isActive }) => `topnav-item ${isActive ? 'active' : ''}`}>
                <Icon aria-hidden="true" />
                <span className="nav-long">{label}</span>
                <span className="nav-short">{short || label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="topbar-right">
            <span className="scope-pill" title="What this account can see"><MapPin />{scopeLabel(user)}</span>
            <div className="account" ref={menuRef}>
              <button type="button" className="user-chip" aria-label={`Account menu for ${user.full_name}`} aria-haspopup="true" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
                <span className="user-initials" aria-hidden="true">{getInitials(user.full_name)}</span>
                <span className="user-text">
                  <span className="user-name">{user.full_name}</span>
                  <span className="user-role">{roleLabel(user.role)}</span>
                </span>
                <ChevronDown size={16} className="chev" aria-hidden="true" />
              </button>
              {menuOpen && (
                <div className="account-menu" role="menu">
                  <div className="account-who">
                    <strong>{user.full_name}</strong>
                    <span>{roleLabel(user.role)}</span>
                    <span className="account-scope"><MapPin size={15} aria-hidden="true" />{scopeLabel(user)}</span>
                  </div>
                  <button type="button" role="menuitem" className="account-item" onClick={() => { setMenuOpen(false); setPwOpen(true); }}>
                    <KeyRound size={18} aria-hidden="true" />Change password
                  </button>
                  <button type="button" role="menuitem" className="account-signout" onClick={handleLogout}>
                    <LogOut size={18} aria-hidden="true" />Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <ChangePasswordDialog isOpen={pwOpen} onClose={() => setPwOpen(false)} />

      <main className="main">
        <div className="page"><Outlet /></div>
      </main>
    </div>
  );
}
