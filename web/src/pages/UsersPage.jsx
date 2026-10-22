import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { Alert } from '../components/Alert.jsx';
import { Modal } from '../components/Modal.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Skeleton, SkeletonList } from '../components/Skeleton.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Breadcrumb } from '../components/Breadcrumb.jsx';
import { KpiStrip } from '../components/Card.jsx';
import { Button } from '../components/Button.jsx';
import { Input, FormGroup, FormCheck } from '../components/Form.jsx';
import { ZONES } from '../constants.js';
import { showToast } from '../components/Toast.jsx';
import { Plus, Pencil, Check } from 'lucide-react';

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
    <tr><td colSpan={7} style={{ padding: 0, border: 'none' }}><SkeletonList count={5} variant="row" /></td></tr>
  );

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'User Accounts' },
  ];

  return (
    <div className="page-stack" style={{ animation: 'fadeInUp 0.3s ease backwards' }}>
      <Breadcrumb items={breadcrumbItems} />

      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Staff accounts</h1>
          <p className="page-subtitle">Health center accounts, their role, and the puroks they are assigned to.</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => setIsCreateOpen(true)} iconLeft={<Plus className="h-4 w-4" />}>Create account</Button>
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <KpiStrip
        items={[
          { label: 'Accounts', value: total, sub: roleFilter ? `with the ${roleFilter} role` : 'all roles on record' },
          { label: 'Active', value: activeTotal, sub: 'can sign in to the system' },
          { label: 'Deactivated', value: Math.max(total - activeTotal, 0), sub: 'sessions revoked, records kept' },
        ]}
      />

      <div className="toolbar" style={{ paddingBottom: '1rem' }}>
        <label htmlFor="role_filter" style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Role</label>
        <select id="role_filter" className="form-select" style={{ width: 'auto', minWidth: '180px' }} value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          <option value="BHW">BHW</option>
          <option value="MIDWIFE">Midwife</option>
          <option value="ADMIN">Administrator</option>
        </select>
        <label className="form-check" style={{ marginBottom: 0 }}>
          <input type="checkbox" checked={includeInactive} onChange={(e) => { setIncludeInactive(e.target.checked); setPage(1); }} />
          <span className="form-check-label">Include deactivated</span>
        </label>
        <span className="toolbar-meta">
          <strong>{users.length}</strong> of <strong>{total}</strong> accounts
        </span>
      </div>

      <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '150px' }}>Account</th>
                <th>Full name</th>
                <th style={{ width: '120px' }}>Role</th>
                <th style={{ width: '150px' }}>Assigned puroks</th>
                <th style={{ width: '110px' }}>Status</th>
                <th style={{ width: '180px' }}>Last login</th>
                <th style={{ width: '150px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? renderSkeletonRows() : users.length === 0 ? (
                <tr><td colSpan={7}><EmptyState title="No user accounts found" description="No accounts match the current filters." actionLabel={roleFilter ? 'Clear filter' : 'Create account'} action={roleFilter ? () => setRoleFilter('') : () => setIsCreateOpen(true)} /></td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.7 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div className="avatar-cell">{getInitials(u.full_name)}</div>
                        <code style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{u.username}</code>
                      </div>
                    </td>
                    <td><strong style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{u.full_name}</strong></td>
                    <td>{getRoleBadge(u.role)}</td>
                    <td>
                      {u.role === 'BHW' ? (
                        u.zone_ids && u.zone_ids.length > 0 ? u.zone_ids.map((zId) => <span key={zId} className="badge badge-teal" style={{ marginRight: '4px' }}>Purok {zId}</span>) : <span style={{ color: 'var(--faint)' }}>—</span>
                      ) : <span style={{ color: 'var(--faint)' }}>All puroks</span>}
                    </td>
                    <td>{u.is_active ? <span className="badge badge-emerald">Active</span> : <span className="badge badge-slate">Deactivated</span>}</td>
                    <td><span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never signed in'}</span></td>
                    <td style={{ textAlign: 'right' }}><Button variant="secondary" onClick={() => setEditingUser({ ...u, password: '' })} iconLeft={<Pencil className="h-4 w-4" />}>Edit</Button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} total={total} unit="accounts" onPageChange={(p) => setPage(p)} />

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create user account"
        subtitle="Credentials are hashed with bcrypt before they are stored."
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="user-create-form" disabled={actionLoading}>{actionLoading ? 'Creating...' : 'Create account'}</Button>
          </>
        }
      >
        <form id="user-create-form" onSubmit={handleCreateSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormGroup label="Username" required hint="3 to 50 characters: lowercase letters, numbers, dot, underscore, or hyphen"><Input type="text" placeholder="e.g. bhw3, midwife2" pattern="^[a-z0-9._-]{3,50}$" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required /></FormGroup>
            <FormGroup label="Password" required hint="Minimum 8 characters"><Input type="password" placeholder="Minimum 8 characters" minLength={8} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required /></FormGroup>
            <FormGroup label="Full name" required><Input type="text" placeholder="Staff member full name" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} required /></FormGroup>
            <FormGroup label="System role" required>
              <select className="form-select" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} required>
                <option value="BHW">BHW (barangay health worker)</option>
                <option value="MIDWIFE">Midwife</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </FormGroup>
            {newUser.role === 'BHW' && (
              <FormGroup label="Assign purok zones" hint="A BHW can only see residents in the puroks assigned here.">
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
        title="Edit user account"
        subtitle={`Managing ${editingUser?.username || ''}`}
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form="user-edit-form" disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Save changes'}</Button>
          </>
        }
      >
        {editingUser && (
          <form id="user-edit-form" onSubmit={handleEditSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <FormGroup label="Username" hint="The username is unique and cannot be changed."><Input type="text" value={editingUser.username} disabled /></FormGroup>
              <FormGroup label="Full name" required><Input type="text" value={editingUser.full_name} onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })} required /></FormGroup>
              <FormGroup label="Reset password" hint="Leave blank to keep the current password."><Input type="password" placeholder="New password (min 8 characters)" minLength={8} value={editingUser.password || ''} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} /></FormGroup>
              <FormGroup label="System role" required>
                <select className="form-select" value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })} required>
                  <option value="BHW">BHW</option>
                  <option value="MIDWIFE">Midwife</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </FormGroup>
              {editingUser.role === 'BHW' && (
                <FormGroup label="Assigned purok zones">
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {ZONES.map((z) => {
                      const checked = (editingUser.zone_ids || []).includes(z.id);
                      return (<div key={z.id} className={`condition-chip ${checked ? 'active' : ''}`} onClick={() => handleZoneToggle(z.id, false)}><span className="chip-mark">{checked ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span><span>{z.name}</span></div>);
                    })}
                  </div>
                </FormGroup>
              )}
              <div className="panel">
                <div className="panel-head">Account status</div>
                <div className="panel-body">
                  <label className="form-check" style={{ marginBottom: 0 }}>
                    <input type="checkbox" checked={editingUser.is_active} onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })} />
                    <span className="form-check-label">{editingUser.is_active ? 'Account is active' : 'Account is deactivated'}</span>
                  </label>
                  {!editingUser.is_active && (<div style={{ fontSize: 'var(--fs-sm)', color: 'var(--pill-negative-ink)', marginTop: '0.5rem', lineHeight: 1.5 }}>Deactivating revokes all active login sessions for this account. The account record is kept for the audit trail.</div>)}
                </div>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
