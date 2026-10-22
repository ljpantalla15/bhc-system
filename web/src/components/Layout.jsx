import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from './Avatar.jsx';
import { Home, Users, FileText, Shield, LogOut, Menu, X } from 'lucide-react';

const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

/** The health center's mark: a white cross on the brand hue. */
function HealthMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 4.5h4V10h5.5v4H14v5.5h-4V14H4.5v-4H10V4.5Z" fill="currentColor" />
    </svg>
  );
}

const navItems = (role) => {
  if (role === 'BHW') return [
    { to: '/households/new', label: 'Encode household', icon: Home },
    { to: '/residents', label: 'Resident directory', icon: Users },
    { to: '/masterlists', label: 'Program masterlists', icon: FileText },
  ];
  if (role === 'MIDWIFE') return [
    { to: '/residents', label: 'Resident directory', icon: Users },
    { to: '/masterlists', label: 'Program masterlists', icon: FileText },
  ];
  if (role === 'ADMIN') return [{ to: '/users', label: 'User accounts', icon: Shield }];
  return [];
};

const scopeLabel = (user) => {
  if (!user) return '';
  if (user.role === 'BHW') {
    const zones = user.zone_ids || [];
    return zones.length > 0 ? `Purok ${zones.join(', ')}` : 'No purok assigned';
  }
  if (user.role === 'MIDWIFE') return 'All puroks';
  return 'System accounts';
};

const roleLabel = (role) => {
  if (role === 'BHW') return 'Barangay Health Worker';
  if (role === 'MIDWIFE') return 'Midwife';
  if (role === 'ADMIN') return 'Administrator';
  return role;
};

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);
  useEffect(() => { document.body.style.overflow = sidebarOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [sidebarOpen]);

  if (!user) return null;

  const items = navItems(user.role);

  return (
    <div className="app">
      {sidebarOpen && (<div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />)}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="brand-mark"><HealthMark size={17} /></div>
            <div className="brand-text">
              <strong>Barangay Tago</strong>
              <span>Health Center</span>
            </div>
          </div>
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>

        <nav className="sidebar-nav" aria-label="Main">
          <div className="sidebar-section">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
                  <Icon className="h-[17px] w-[17px] shrink-0" /><span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div className="sidebar-bottom">
          <button onClick={handleLogout} className="sidebar-item signout">
            <LogOut className="h-[17px] w-[17px] shrink-0" /><span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="app-body">
        <header className="header">
          <div className="header-left">
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
            <span className="header-scope">
              <span className="header-scope-label">Scope</span>
              <strong>{scopeLabel(user)}</strong>
            </span>
          </div>
          <div className="header-right">
            <div className="header-divider" aria-hidden="true" />
            <div className="user-chip">
              <Avatar initials={getInitials(user.full_name)} role={user.role} size="sm" status="online" />
              <div className="user-info">
                <div className="user-name">{user.full_name}</div>
                <div className="user-role">{roleLabel(user.role)}</div>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Sign out" aria-label="Sign out"><LogOut className="h-[18px] w-[18px]" /></button>
          </div>
        </header>

        <main className="main">
          <div className="page"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
