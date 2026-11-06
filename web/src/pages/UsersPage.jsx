import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert } from '../components/Alert.jsx';
import { Modal } from '../components/Modal.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { SkeletonList } from '../components/Skeleton.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Button } from '../components/Button.jsx';
import { Input, FormGroup } from '../components/Form.jsx';
import { ZONES } from '../constants.js';
import { showToast } from '../components/Toast.jsx';
import { Plus, Pencil, Check, Search, X, Eye, EyeOff, RefreshCw, AlertTriangle, KeyRound } from 'lucide-react';

const ROLES = [
  { code: 'BHW', label: 'Health worker', desc: 'Encodes and edits residents in assigned puroks.' },
  { code: 'MIDWIFE', label: 'Midwife', desc: 'Reads all puroks and prints masterlists. No edits.' },
  { code: 'ADMIN', label: 'Administrator', desc: 'Manages staff accounts. No resident data.' },
];
const ROLE_LABEL = { BHW: 'Health worker', MIDWIFE: 'Midwife', ADMIN: 'Administrator' };
const USERNAME_RE = /^[a-z0-9._-]{3,50}$/;
const PAGE_SIZE = 15;

/* What each account can reach, in one line. */
const coverage = (u) => {
  if (u.role === 'MIDWIFE') return 'All puroks, read only';
  if (u.role === 'ADMIN') return 'Staff accounts only';
  const z = u.zone_ids || [];
  return z.length ? z.map((id) => `Purok ${id}`).join(', ') : null;
};

/* "Today, 9:10 AM", "Yesterday, 4:00 PM", or a short date. */
const lastSeen = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(d)) / 86400000);
  if (days === 0) return { main: 'Today', sub: time };
  if (days === 1) return { main: 'Yesterday', sub: time };
  if (days < 7) return { main: `${days} days ago`, sub: d.toLocaleDateString([], { month: 'short', day: 'numeric' }) };
  return { main: d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }), sub: time };
};

const initials = (name) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name || 'U').slice(0, 2).toUpperCase();
};

/* "Ana Reyes" -> "ana.reyes" */
const suggestUsername = (fullName) => {
  const parts = fullName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return (parts.length === 1 ? parts[0] : `${parts[0]}.${parts[parts.length - 1]}`).slice(0, 50);
};

/* A readable random password: no look-alike characters (0/O, 1/l/I). */
const generatePassword = () => {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const pick = (set, n) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (v) => set[v % set.length]).join('');
  return `${pick(letters, 4)}-${pick(digits, 4)}-${pick(letters, 4)}`;
};

function RolePicker({ value, onChange, disabled }) {
  return (
    <div className="choice-grid" role="radiogroup" aria-label="Role">
      {ROLES.map((r) => (
        <button key={r.code} type="button" role="radio" aria-checked={value === r.code} className="choice-card" disabled={disabled} onClick={() => onChange(r.code)}>
          <strong>{r.label}</strong><span>{r.desc}</span>
        </button>
      ))}
    </div>
  );
}

function PurokPicker({ value = [], onToggle, error }) {
  return (
    <>
      <div className="chip-row" role="group" aria-label="Assigned puroks">
        {ZONES.map((z) => {
          const on = value.includes(z.id);
          return (
            <button key={z.id} type="button" className={`condition-chip ${on ? 'active' : ''}`} aria-pressed={on} onClick={() => onToggle(z.id)}>
              <span className="chip-mark">{on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span>
              <span>{z.name}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="field-error">{error}</p>}
    </>
  );
}

function PasswordField({ value, onChange, placeholder, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-field">
      <div className="input-affix has-btn">
        <Input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} minLength={8} autoComplete="new-password" placeholder={placeholder} autoFocus={autoFocus} />
        <button type="button" className="affix-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      <Button variant="secondary" size="sm" type="button" iconLeft={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => { onChange(generatePassword()); setShow(true); }}>Generate</Button>
    </div>
  );
}

const emptyNew = (zone) => ({ username: '', usernameTouched: false, password: '', full_name: '', role: 'BHW', zone_ids: zone ? [zone] : [] });

export function UsersPage() {
  const { user: me } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [roleFilter, setRoleFilter] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState(emptyNew());
  const [createTried, setCreateTried] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPwReset, setShowPwReset] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  /* Staff lists are small, so every account is loaded once (a page of 100 at a
     time) and filtered here. Counts and the purok coverage then always agree. */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const all = [];
      for (let p = 1; p <= 50; p += 1) {
        const res = await api(`/api/users?include_inactive=true&page=${p}&page_size=100`);
        const items = res.items || [];
        all.push(...items);
        if (items.length === 0 || p * 100 >= (res.total ?? 0)) break;
      }
      setAllUsers(all);
    } catch (err) {
      setError(err.message || 'Staff accounts could not be loaded.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const active = allUsers.filter((u) => u.is_active);
  const counts = {
    BHW: active.filter((u) => u.role === 'BHW').length,
    MIDWIFE: active.filter((u) => u.role === 'MIDWIFE').length,
    ADMIN: active.filter((u) => u.role === 'ADMIN').length,
    off: allUsers.length - active.length,
  };

  /* Which active health workers cover each purok. */
  const purokCover = ZONES.map((z) => ({ ...z, workers: active.filter((u) => u.role === 'BHW' && (u.zone_ids || []).includes(z.id)) }));
  const uncovered = purokCover.filter((z) => z.workers.length === 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allUsers
      .filter((u) => (showInactive || u.is_active))
      .filter((u) => !roleFilter || u.role === roleFilter)
      .filter((u) => !q || u.full_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
      .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.full_name.localeCompare(b.full_name));
  }, [allUsers, showInactive, roleFilter, query]);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = (zone) => { setNewUser(emptyNew(zone)); setCreateTried(false); setIsCreateOpen(true); };
  const openEdit = (u) => { setEditingUser({ ...u, zone_ids: u.zone_ids || [], password: '' }); setShowPwReset(false); };

  /* ---------- create */
  const createErrors = {
    full_name: !newUser.full_name.trim() && 'Enter the full name.',
    username: !USERNAME_RE.test(newUser.username) && '3 to 50 lowercase letters, numbers, dot, underscore or hyphen.',
    taken: allUsers.some((u) => u.username === newUser.username) && 'This username is already used.',
    password: newUser.password.length < 8 && 'At least 8 characters.',
    zones: newUser.role === 'BHW' && newUser.zone_ids.length === 0 && 'Pick at least one purok.',
  };
  const createOk = !Object.values(createErrors).some(Boolean);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateTried(true);
    if (!createOk) return;
    setActionLoading(true);
    try {
      const payload = { username: newUser.username, password: newUser.password, full_name: newUser.full_name.trim(), role: newUser.role };
      if (newUser.role === 'BHW') payload.zone_ids = newUser.zone_ids;
      await api('/api/users', { method: 'POST', body: JSON.stringify(payload) });
      showToast({ type: 'success', message: `Account "${payload.username}" created. Give ${payload.full_name.split(' ')[0]} the username and password.` });
      setIsCreateOpen(false);
      fetchUsers();
    } catch (err) {
      showToast({ type: 'danger', message: err.message || 'The account could not be created.' });
    } finally { setActionLoading(false); }
  };

  /* ---------- edit */
  const isSelf = editingUser && me && editingUser.id === me.id;
  const editErrors = editingUser ? {
    full_name: !editingUser.full_name.trim() && 'Enter the full name.',
    password: showPwReset && editingUser.password.length < 8 && 'At least 8 characters.',
    zones: editingUser.role === 'BHW' && editingUser.zone_ids.length === 0 && 'Pick at least one purok.',
  } : {};

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (Object.values(editErrors).some(Boolean)) return;
    setActionLoading(true);
    try {
      const payload = { full_name: editingUser.full_name.trim() };
      if (!isSelf) { payload.role = editingUser.role; payload.is_active = editingUser.is_active; }
      if (showPwReset && editingUser.password) payload.password = editingUser.password;
      if (editingUser.role === 'BHW') payload.zone_ids = editingUser.zone_ids;
      await api(`/api/users/${editingUser.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      showToast({ type: 'success', message: `${editingUser.full_name}'s account was updated.` });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      showToast({ type: 'danger', message: err.message || 'The account could not be updated.' });
    } finally { setActionLoading(false); }
  };

  const toggleZone = (setter) => (id) => setter((prev) => ({
    ...prev,
    zone_ids: prev.zone_ids.includes(id) ? prev.zone_ids.filter((z) => z !== id) : [...prev.zone_ids, id].sort(),
  }));

  const scrollToCoverage = () => document.getElementById('purok-coverage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="page-stack staff-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff accounts</h1>
          <p className="page-subtitle">Who can sign in, what they can do, and which puroks each health worker covers.</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => openCreate()} iconLeft={<Plus className="h-4 w-4" />}>Create account</Button>
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />

      {!loading && uncovered.length > 0 && (
        <div className="alert alert-warning" role="status">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <strong>
              {uncovered.length === 1
                ? `${uncovered[0].name} has`
                : `Puroks ${uncovered.slice(0, -1).map((z) => z.id).join(', ')} and ${uncovered[uncovered.length - 1].id} have`} no active health worker.
            </strong>{' '}
            <span className="hide-sm">Residents there cannot be encoded or updated until someone is assigned.</span>
            <button type="button" className="link-btn show-sm" onClick={scrollToCoverage}>See coverage</button>
          </div>
        </div>
      )}

      <div className="staff-layout">
        <div className="staff-main">
          <div className="staff-summary" role="group" aria-label="Filter by role">
            {[
              { code: '', label: 'All accounts', short: 'All', n: allUsers.length },
              { code: 'BHW', label: 'Health workers', short: 'Health workers', n: counts.BHW },
              { code: 'MIDWIFE', label: 'Midwives', short: 'Midwives', n: counts.MIDWIFE },
              { code: 'ADMIN', label: 'Administrators', short: 'Admins', n: counts.ADMIN },
            ].map((r) => (
              <button key={r.code || 'all'} type="button" className="staff-stat" aria-pressed={roleFilter === r.code} onClick={() => { setRoleFilter(r.code); setPage(1); }}>
                <span className="hide-sm">{r.label}</span>
                <span className="show-sm">{r.short}</span>
                <strong>{loading ? '–' : r.n}</strong>
              </button>
            ))}
          </div>

          <div className="toolbar">
            <div className="toolbar-search">
              <div className="input-affix has-btn">
                <span className="affix-icon"><Search className="h-4 w-4" /></span>
                <Input placeholder="Search name or username" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} aria-label="Search staff" />
                {query && <button type="button" className="affix-btn" onClick={() => setQuery('')} aria-label="Clear search"><X className="h-4 w-4" /></button>}
              </div>
            </div>
            <label className="form-check">
              <input type="checkbox" checked={showInactive} onChange={(e) => { setShowInactive(e.target.checked); setPage(1); }} />
              <span className="form-check-label">Show deactivated ({counts.off})</span>
            </label>
          </div>

          <div className="table-card">
            <div className="table-wrap">
              <table className="table table-stack staff-table">
                <thead>
                  <tr>
                    <th className="col-staff">Staff member</th>
                    <th>Role and coverage</th>
                    <th className="col-status">Status</th>
                    <th className="col-seen">Last sign-in</th>
                    <th className="col-actions"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ padding: '0.5rem 0' }}><SkeletonList count={4} variant="row" /></td></tr>
                  ) : pageRows.length === 0 ? (
                    <tr><td colSpan={5}><EmptyState title="No accounts match" description="Try another role or name." actionLabel="Clear filters" action={() => { setRoleFilter(''); setQuery(''); setShowInactive(true); }} /></td></tr>
                  ) : pageRows.map((u) => {
                    const cov = coverage(u);
                    const seen = lastSeen(u.last_login_at);
                    return (
                      <tr key={u.id} className={`row-click ${u.is_active ? '' : 'is-off'}`} onClick={(e) => { if (!e.target.closest('button')) openEdit(u); }}>
                        <td className="cell-staff">
                          <div className="avatar-cell" aria-hidden="true">{initials(u.full_name)}</div>
                          <div className="cell-name">
                            <strong>{u.full_name}{me && u.id === me.id && <em className="you-tag">You</em>}</strong>
                            <span><code>{u.username}</code></span>
                          </div>
                        </td>
                        <td className="cell-role">
                          <strong>{ROLE_LABEL[u.role] || u.role}</strong>
                          {cov ? <span>{cov}</span> : <span className="warn">No purok assigned yet</span>}
                        </td>
                        <td>{u.is_active ? <span className="badge badge-positive badge-dot">Active</span> : <span className="badge badge-slate badge-dot">Deactivated</span>}</td>
                        <td className="cell-seen">
                          {seen ? <><strong>{seen.main}</strong><span>{seen.sub}</span></> : <span className="never">Never signed in</span>}
                        </td>
                        <td>
                          <div className="row-actions">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(u)} iconLeft={<Pencil className="h-3.5 w-3.5" />} aria-label={`Edit ${u.full_name}`}>Edit</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} unit="accounts" onPageChange={setPage} />
          </div>
        </div>

        <aside className="staff-rail">
          <section className="home-panel" id="purok-coverage">
            <header><h2>Purok coverage</h2></header>
            <ul className="cover-list">
              {purokCover.map((z) => (
                <li key={z.id} className={z.workers.length ? '' : 'is-gap'}>
                  <div>
                    <strong>{z.name}</strong>
                    {z.workers.length
                      ? <span>{z.workers.map((w) => w.full_name).join(', ')}</span>
                      : <span className="warn">No health worker</span>}
                  </div>
                  {!z.workers.length && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openCreate(z.id)}>Add</button>
                  )}
                </li>
              ))}
            </ul>
            <p className="home-note">Only active health workers count. Deactivated accounts keep their record but cannot sign in.</p>
          </section>
        </aside>
      </div>

      {/* ---------------------------------------------------------- create */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create staff account"
        subtitle="They sign in with the username and password you set here."
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="user-create-form" loading={actionLoading}>{actionLoading ? 'Creating…' : 'Create account'}</Button>
          </>
        }
      >
        <form id="user-create-form" className="sheet-body" onSubmit={handleCreateSubmit} noValidate>
          <section className="sheet-section">
            <h3>1. Role</h3>
            <RolePicker value={newUser.role} onChange={(role) => setNewUser((p) => ({ ...p, role }))} />
            {newUser.role === 'BHW' && (
              <div className="form-sub">
                <p className="form-label">Assigned puroks</p>
                <PurokPicker value={newUser.zone_ids} onToggle={toggleZone(setNewUser)} error={createTried && createErrors.zones} />
                <p className="form-hint">The health worker sees and edits only residents in these puroks.</p>
              </div>
            )}
          </section>

          <section className="sheet-section">
            <h3>2. Person</h3>
            <div className="form-stack">
              <FormGroup label="Full name" required error={createTried && createErrors.full_name}>
                <Input value={newUser.full_name} placeholder="e.g. Ana Reyes"
                  onChange={(e) => { const v = e.target.value; setNewUser((p) => ({ ...p, full_name: v, username: p.usernameTouched ? p.username : suggestUsername(v) })); }} />
              </FormGroup>
              <FormGroup label="Username" required hint="Suggested from the name. Lowercase letters, numbers, dot, underscore or hyphen." error={(createTried || newUser.usernameTouched) && (createErrors.username || createErrors.taken)}>
                <Input className="code" value={newUser.username} placeholder="e.g. ana.reyes"
                  onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value.toLowerCase().trim(), usernameTouched: true }))} />
              </FormGroup>
            </div>
          </section>

          <section className="sheet-section">
            <h3>3. Password</h3>
            <FormGroup label="Starting password" required hint="At least 8 characters. Give it to the person in private; they can't see it later." error={createTried && createErrors.password}>
              <PasswordField value={newUser.password} onChange={(v) => setNewUser((p) => ({ ...p, password: v }))} />
            </FormGroup>
          </section>
        </form>
      </Modal>

      {/* ------------------------------------------------------------ edit */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={editingUser ? editingUser.full_name : 'Edit account'}
        subtitle={editingUser ? `${editingUser.username} · ${ROLE_LABEL[editingUser.role]}` : ''}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form="user-edit-form" loading={actionLoading}>{actionLoading ? 'Saving…' : 'Save changes'}</Button>
          </>
        }
      >
        {editingUser && (
          <form id="user-edit-form" className="sheet-body" onSubmit={handleEditSubmit} noValidate>
            <section className="sheet-section">
              <h3>Details</h3>
              <FormGroup label="Full name" required error={editErrors.full_name}>
                <Input value={editingUser.full_name} onChange={(e) => setEditingUser((p) => ({ ...p, full_name: e.target.value }))} />
              </FormGroup>
            </section>

            <section className="sheet-section">
              <h3>Role and puroks</h3>
              <RolePicker value={editingUser.role} disabled={isSelf} onChange={(role) => setEditingUser((p) => ({ ...p, role }))} />
              {isSelf && <p className="form-hint">You can't change the role of the account you are signed in with.</p>}
              {editingUser.role === 'BHW' && (
                <div className="form-sub">
                  <p className="form-label">Assigned puroks</p>
                  <PurokPicker value={editingUser.zone_ids} onToggle={toggleZone(setEditingUser)} error={editErrors.zones} />
                </div>
              )}
            </section>

            <section className="sheet-section">
              <h3>Password</h3>
              {showPwReset ? (
                <FormGroup label="New password" hint="At least 8 characters. They will use it on their next sign-in." error={editErrors.password}>
                  <PasswordField value={editingUser.password} onChange={(v) => setEditingUser((p) => ({ ...p, password: v }))} autoFocus />
                </FormGroup>
              ) : (
                <div className="pw-reset-row">
                  <span>The current password stays unless you set a new one.</span>
                  <Button variant="secondary" size="sm" type="button" iconLeft={<KeyRound className="h-3.5 w-3.5" />} onClick={() => setShowPwReset(true)}>Set a new password</Button>
                </div>
              )}
            </section>

            <section className="sheet-section">
              <h3>Account status</h3>
              {isSelf ? (
                <p className="form-hint">This is your account. It stays active while you are signed in with it.</p>
              ) : (
                <div className={`status-row ${editingUser.is_active ? '' : 'is-off'}`}>
                  <div>
                    <strong>{editingUser.is_active ? 'Active: can sign in' : 'Deactivated: cannot sign in'}</strong>
                    <span>{editingUser.is_active
                      ? 'Deactivating signs them out everywhere. Their record and history are kept.'
                      : 'Reactivating lets them sign in again with their password.'}</span>
                  </div>
                  <Button variant={editingUser.is_active ? 'danger-outline' : 'secondary'} size="sm" type="button"
                    onClick={() => setEditingUser((p) => ({ ...p, is_active: !p.is_active }))}>
                    {editingUser.is_active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </div>
              )}
            </section>
          </form>
        )}
      </Modal>
    </div>
  );
}
