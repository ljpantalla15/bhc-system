import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { Alert } from '../components/Alert.jsx';
import { Modal } from '../components/Modal.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Skeleton, SkeletonList } from '../components/Skeleton.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { KpiStrip } from '../components/Card.jsx';
import { Button } from '../components/Button.jsx';
import { Input, FormGroup, FormCheck } from '../components/Form.jsx';
import { ZONES } from '../constants.js';
import { showToast } from '../components/Toast.jsx';
import { Plus, Pencil, Check } from 'lucide-react';

const ROLES = [
  { code: 'BHW', label: 'Health worker', desc: 'Encodes and edits residents in assigned puroks.' },
  { code: 'MIDWIFE', label: 'Midwife', desc: 'Reads all puroks and prints masterlists. No edits.' },
  { code: 'ADMIN', label: 'Administrator', desc: 'Manages staff accounts. No resident data.' },
];
const ROLE_LABEL = { BHW: 'Health worker', MIDWIFE: 'Midwife', ADMIN: 'Administrator' };

function RolePicker({ value, onChange }) {
  return (
    <div className="choice-grid" role="radiogroup" aria-label="Role">
      {ROLES.map((r) => (
        <button key={r.code} type="button" role="radio" aria-checked={value === r.code} className="choice-card" onClick={() => onChange(r.code)}>
          <strong>{r.label}</strong><span>{r.desc}</span>
        </button>
      ))}
    </div>
  );
}

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [roleFilter, setRoleFilter] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTotal, setActiveTotal] = useState(0);
  const pageSize = 15;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [newUser, setNewUser] = useState({ username: '', password: '', full_name: '', role: 'BHW', zone_ids: [1] });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      params.set('include_inactive', String(includeInactive));
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      const res = await api(`/api/users?${params.toString()}`);
      setUsers(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load user accounts.');
    } finally { setLoading(false); }
  }, [roleFilter, includeInactive, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // The KPI strip reports whole-population counts, so the active total is
  // fetched separately (page rows alone would not reconcile with the total).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (roleFilter) params.set('role', roleFilter);
        params.set('include_inactive', 'false');
        params.set('page', '1');
        params.set('page_size', '1');
        const res = await api(`/api/users?${params.toString()}`);
        if (!cancelled) setActiveTotal(res.total || 0);
      } catch {
        if (!cancelled) setActiveTotal(0);
      }
    })();
    return () => { cancelled = true; };
  }, [roleFilter]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    try {
      const payload = { username: newUser.username.trim().toLowerCase(), password: newUser.password, full_name: newUser.full_name.trim(), role: newUser.role };
      if (newUser.role === 'BHW') payload.zone_ids = newUser.zone_ids;
      await api('/api/users', { method: 'POST', body: JSON.stringify(payload) });
      showToast({ type: 'success', message: `User account "${payload.username}" created.` });
      setIsCreateOpen(false);
      setNewUser({ username: '', password: '', full_name: '', role: 'BHW', zone_ids: [1] });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user account.');
      showToast({ type: 'danger', message: 'Failed to create user account.' });
    } finally { setActionLoading(false); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    try {
      const payload = { full_name: editingUser.full_name.trim(), role: editingUser.role, is_active: editingUser.is_active };
      if (editingUser.password && editingUser.password.trim()) payload.password = editingUser.password.trim();
      if (editingUser.role === 'BHW') payload.zone_ids = editingUser.zone_ids || [];
      await api(`/api/users/${editingUser.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      showToast({ type: 'success', message: 'User account updated successfully.' });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user account.');
      showToast({ type: 'danger', message: 'Failed to update user account.' });
    } finally { setActionLoading(false); }
  };

  const handleZoneToggle = (zoneId, isCreating) => {
    if (isCreating) {
      setNewUser((prev) => {
        const current = prev.zone_ids || [];
        const updated = current.includes(zoneId) ? current.filter((z) => z !== zoneId) : [...current, zoneId];
        return { ...prev, zone_ids: updated };
      });
    } else {
      setEditingUser((prev) => {
        const current = prev.zone_ids || [];
        const updated = current.includes(zoneId) ? current.filter((z) => z !== zoneId) : [...current, zoneId];
        return { ...prev, zone_ids: updated };
      });
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN': return <span className="badge badge-slate">Administrator</span>;
      case 'MIDWIFE': return <span className="badge badge-slate">Midwife</span>;
      case 'BHW': return <span className="badge badge-slate">BHW</span>;
      default: return <span className="badge badge-slate">{role}</span>;
    }
  };

  const renderSkeletonRows = () => (
    <tr><td colSpan={6} style={{ padding: '0.5rem 0' }}><SkeletonList count={5} variant="row" /></td></tr>
  );

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff accounts</h1>
          <p className="page-subtitle">Who can sign in, what role they have, and which puroks each health worker covers.</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => setIsCreateOpen(true)} iconLeft={<Plus className="h-4 w-4" />}>Create account</Button>
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <KpiStrip
        items={[
          { label: 'Accounts', value: total, sub: roleFilter ? `${ROLE_LABEL[roleFilter]} accounts` : 'all roles' },
          { label: 'Active', value: activeTotal, sub: 'can sign in to the system' },
          { label: 'Deactivated', value: Math.max(total - activeTotal, 0), sub: 'sessions revoked, records kept' },
        ]}
      />

      <div className="toolbar">
        <div className="seg-control" role="group" aria-label="Filter by role">
          {[{ code: '', label: 'All roles' }, ...ROLES].map((r) => (
            <button key={r.code || 'all'} type="button" className={`seg-btn ${roleFilter === r.code ? 'on' : ''}`} aria-pressed={roleFilter === r.code} onClick={() => { setRoleFilter(r.code); setPage(1); }}>{r.label}</button>
          ))}
        </div>
        <label className="form-check">
          <input type="checkbox" checked={includeInactive} onChange={(e) => { setIncludeInactive(e.target.checked); setPage(1); }} />
          <span className="form-check-label">Show deactivated</span>
        </label>
        <span className="toolbar-meta"><strong>{users.length}</strong> of <strong>{total}</strong> accounts</span>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Role</th>
                <th>Puroks</th>
                <th>Status</th>
                <th>Last sign-in</th>
                <th style={{ textAlign: 'right' }}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? renderSkeletonRows() : users.length === 0 ? (
                <tr><td colSpan={6}><EmptyState title="No accounts match" description="Try another role, or show deactivated accounts." actionLabel={roleFilter ? 'Clear filter' : 'Create account'} action={roleFilter ? () => setRoleFilter('') : () => setIsCreateOpen(true)} /></td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.65 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <div className="avatar-cell">{getInitials(u.full_name)}</div>
                        <div className="cell-name"><strong>{u.full_name}</strong><span><code>{u.username}</code></span></div>
                      </div>
                    </td>
                    <td>{ROLE_LABEL[u.role] || u.role}</td>
                    <td>
                      {u.role === 'BHW' ? (
                        u.zone_ids && u.zone_ids.length > 0
                          ? <div className="flags">{u.zone_ids.map((zId) => <span key={zId} className="badge badge-teal">Purok {zId}</span>)}</div>
                          : <span className="badge badge-amber">None assigned</span>
                      ) : <span className="faint">{u.role === 'MIDWIFE' ? 'All puroks' : 'Not applicable'}</span>}
                    </td>
                    <td>{u.is_active ? <span className="badge badge-positive badge-dot">Active</span> : <span className="badge badge-slate badge-dot">Deactivated</span>}</td>
                    <td className="muted">{u.last_login_at ? new Date(u.last_login_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}</td>
                    <td style={{ textAlign: 'right' }}><Button variant="ghost" size="sm" onClick={() => setEditingUser({ ...u, password: '' })} iconLeft={<Pencil className="h-3.5 w-3.5" />}>Edit</Button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} unit="accounts" onPageChange={(p) => setPage(p)} />
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create staff account"
        subtitle="The password is stored as a bcrypt hash, never as plain text."
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="user-create-form" disabled={actionLoading}>{actionLoading ? 'Creating…' : 'Create account'}</Button>
          </>
        }
      >
        <form id="user-create-form" onSubmit={handleCreateSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormGroup label="Full name" required><Input type="text" placeholder="e.g. Ana Reyes" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} required /></FormGroup>
            <div className="form-grid form-grid-2">
              <FormGroup label="Username" required hint="3–50 lowercase letters, numbers, dot, underscore or hyphen"><Input type="text" className="code" placeholder="e.g. bhw3" pattern="^[a-z0-9._-]{3,50}$" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required /></FormGroup>
              <FormGroup label="Password" required hint="At least 8 characters"><Input type="password" minLength={8} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required autoComplete="new-password" /></FormGroup>
            </div>
            <FormGroup label="Role" required>
              <RolePicker value={newUser.role} onChange={(role) => setNewUser({ ...newUser, role })} />
            </FormGroup>
            {newUser.role === 'BHW' && (
              <FormGroup label="Assigned puroks" hint="A health worker sees only residents in these puroks.">
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {ZONES.map((z) => {
                    const checked = (newUser.zone_ids || []).includes(z.id);
                    return (<div key={z.id} className={`condition-chip ${checked ? 'active' : ''}`} onClick={() => handleZoneToggle(z.id, true)}><span className="chip-mark">{checked ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span><span>{z.name}</span></div>);
                  })}
                </div>
              </FormGroup>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={editingUser ? editingUser.full_name : 'Edit account'}
        subtitle={editingUser ? `Username ${editingUser.username}` : ''}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form="user-edit-form" disabled={actionLoading}>{actionLoading ? 'Saving…' : 'Save changes'}</Button>
          </>
        }
      >
        {editingUser && (
          <form id="user-edit-form" onSubmit={handleEditSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <FormGroup label="Full name" required><Input type="text" value={editingUser.full_name} onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })} required /></FormGroup>
              <FormGroup label="Reset password" hint="Leave blank to keep the current password."><Input type="password" placeholder="At least 8 characters" autoComplete="new-password" minLength={8} value={editingUser.password || ''} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} /></FormGroup>
              <FormGroup label="Role" required>
                <RolePicker value={editingUser.role} onChange={(role) => setEditingUser({ ...editingUser, role })} />
              </FormGroup>
              {editingUser.role === 'BHW' && (
                <FormGroup label="Assigned puroks" hint="A health worker sees only residents in these puroks.">
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {ZONES.map((z) => {
                      const checked = (editingUser.zone_ids || []).includes(z.id);
                      return (<div key={z.id} className={`condition-chip ${checked ? 'active' : ''}`} onClick={() => handleZoneToggle(z.id, false)}><span className="chip-mark">{checked ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span><span>{z.name}</span></div>);
                    })}
                  </div>
                </FormGroup>
              )}
              <label className={`toggle-card ${editingUser.is_active ? 'on' : ''}`}>
                <input type="checkbox" checked={editingUser.is_active} onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })} />
                <span>
                  <strong>{editingUser.is_active ? 'Account is active' : 'Account is deactivated'}</strong>
                  <span>{editingUser.is_active ? 'Untick to stop this person from signing in.' : 'They are signed out everywhere and cannot sign in. The account record is kept for the audit trail.'}</span>
                </span>
              </label>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
