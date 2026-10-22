import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { Alert } from '../components/Alert.jsx';
import { Modal } from '../components/Modal.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Skeleton, SkeletonList } from '../components/Skeleton.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Breadcrumb } from '../components/Breadcrumb.jsx';
import { PurokStrip } from '../components/Card.jsx';
import { Button, IconButton } from '../components/Button.jsx';
import { Input, FormGroup, FormGrid } from '../components/Form.jsx';
import { showToast } from '../components/Toast.jsx';
import {
  ZONES, AGE_RISK_GROUPS, RELATIONS_TO_HEAD, CIVIL_STATUSES,
  EDUCATION_LEVELS, MEDICAL_CONDITIONS, DISABILITY_TYPES, FP_METHODS,
  WATER_SOURCES, TOILET_FACILITIES,
} from '../constants.js';
import { Plus, Search, Eye, Pencil, Trash2, X, Check, Home } from 'lucide-react';

const Icons = {
  plus: <Plus className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  view: <Eye className="h-4 w-4" />,
  edit: <Pencil className="h-4 w-4" />,
  trash: <Trash2 className="h-4 w-4" />,
  close: <X className="h-4 w-4" />,
  closeSm: <X className="h-3.5 w-3.5" />,
  household: <Home className="h-4 w-4" />,
};

/** Short target-group names for the directory column. */
const AGE_GROUP_SHORT = {
  N: 'Newborn',
  I: 'Infant',
  PSAC: 'Preschool',
  SAC: 'School age',
  AD: 'Adolescent',
  A: 'Adult',
  SC: 'Senior citizen',
};

export function ResidentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isBHW = user?.role === 'BHW';
  const assignedZones = user?.zone_ids || [];
  const assignedKey = assignedZones.join(',');

  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [purokCounts, setPurokCounts] = useState({});
  const [countsLoading, setCountsLoading] = useState(true);

  const [q, setQ] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [groupBy, setGroupBy] = useState('household');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalResidents, setTotalResidents] = useState(0);
  const [totalHouseholds, setTotalHouseholds] = useState(0);
  const pageSize = 15;

  const [viewingResident, setViewingResident] = useState(null);
  const [editingResident, setEditingResident] = useState(null);
  const [deactivatingResident, setDeactivatingResident] = useState(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [viewingHousehold, setViewingHousehold] = useState(null);
  const [householdLoading, setHouseholdLoading] = useState(false);

  const fetchResidents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (selectedZone) params.set('zone_id', selectedZone);
      if (ageGroup) params.set('age_risk_group', ageGroup);
      params.set('group_by', groupBy);
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      const data = await api(`/api/residents?${params.toString()}`);
      setResidents(data.items || []);
      setTotal(data.total || 0);
      setTotalResidents(data.total_residents ?? data.total ?? 0);
      setTotalHouseholds(data.total_households ?? 0);
    } catch (err) {
      setError(err.message || 'Failed to load residents.');
      showToast({ type: 'danger', message: 'Failed to load residents.' });
    } finally { setLoading(false); }
  }, [q, selectedZone, ageGroup, groupBy, page]);

  useEffect(() => { fetchResidents(); }, [fetchResidents]);

  const fetchPurokCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const entries = await Promise.all(ZONES.map(async (z) => {
        if (isBHW && !assignedZones.includes(z.id)) return [z.id, undefined];
        try {
          const data = await api(`/api/residents?zone_id=${z.id}&page=1&page_size=1`);
          return [z.id, data.total ?? 0];
        } catch {
          return [z.id, undefined];
        }
      }));
      setPurokCounts(Object.fromEntries(entries));
    } finally {
      setCountsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBHW, assignedKey]);

  useEffect(() => { fetchPurokCounts(); }, [fetchPurokCounts]);

  const handleSearchSubmit = (e) => { e.preventDefault(); setPage(1); fetchResidents(); };
  const handleResetFilters = () => { setQ(''); setSelectedZone(''); setAgeGroup(''); setPage(1); };

  const handleGroupByChange = (value) => { setGroupBy(value); setPage(1); };

  const openHousehold = async (householdId) => {
    setHouseholdLoading(true);
    try {
      const record = await api(`/api/households/${householdId}`);
      setViewingHousehold(record);
    } catch (err) {
      showToast({ type: 'danger', message: err.message || 'Failed to load the household record.' });
    } finally { setHouseholdLoading(false); }
  };

  /**
   * Rows for the table. In household mode a group row is emitted for each
   * household, followed by its members, so a family is read as one block.
   */
  const tableRows = React.useMemo(() => {
    if (groupBy !== 'household') {
      return residents.map((r) => ({ kind: 'resident', resident: r }));
    }
    const shownByHousehold = {};
    for (const r of residents) shownByHousehold[r.household_id] = (shownByHousehold[r.household_id] || 0) + 1;

    const rows = [];
    let currentId = null;
    for (const r of residents) {
      if (r.household_id !== currentId) {
        currentId = r.household_id;
        rows.push({
          kind: 'group',
          household_id: r.household_id,
          household_no: r.household_no,
          zone_name: r.zone_name,
          member_count: r.household_member_count ?? shownByHousehold[r.household_id],
          shown_count: shownByHousehold[r.household_id],
        });
      }
      rows.push({ kind: 'resident', resident: r });
    }
    return rows;
  }, [residents, groupBy]);

  const handleOpenEdit = (res) => {
    setEditingResident({
      ...res,
      medical_conditions: (res.medical_conditions || []).map((c) => c.condition_code),
      other_condition_specify: (res.medical_conditions || []).find((c) => c.condition_code === 'OTH')?.other_specify || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    try {
      const conditions = (editingResident.medical_conditions || []).map((code) => ({
        condition_code: code,
        other_specify: code === 'OTH' ? (editingResident.other_condition_specify || 'Other') : null,
      }));
      const payload = {
        last_name: editingResident.last_name,
        first_name: editingResident.first_name,
        middle_name: editingResident.middle_name || null,
        relation_to_head: editingResident.relation_to_head,
        civil_status_code: editingResident.civil_status_code,
        education_code: editingResident.education_code,
        occupation: editingResident.occupation || null,
        philhealth_id: editingResident.philhealth_id || null,
        is_pregnant: editingResident.sex === 'F' ? Boolean(editingResident.is_pregnant) : false,
        lmp_date: editingResident.sex === 'F' && editingResident.is_pregnant ? editingResident.lmp_date : null,
        uses_fp: editingResident.sex === 'F' ? Boolean(editingResident.uses_fp) : null,
        fp_method_code: editingResident.sex === 'F' && editingResident.uses_fp ? editingResident.fp_method_code : null,
        fp_status_code: editingResident.sex === 'F' && editingResident.uses_fp ? editingResident.fp_status_code : null,
        is_pwd: Boolean(editingResident.is_pwd),
        disability_type_code: editingResident.is_pwd ? editingResident.disability_type_code : null,
        medical_conditions: conditions,
      };
      await api(`/api/residents/${editingResident.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setSuccess(`Resident ${editingResident.first_name} ${editingResident.last_name} updated.`);
      showToast({ type: 'success', message: 'Resident record updated successfully.' });
      setEditingResident(null);
      fetchResidents();
    } catch (err) {
      setError(err.message || 'Failed to update resident.');
      showToast({ type: 'danger', message: 'Failed to update resident record.' });
    } finally { setActionLoading(false); }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingResident) return;
    setActionLoading(true);
    setError('');
    try {
      const url = deactivationReason.trim()
        ? `/api/residents/${deactivatingResident.id}?reason=${encodeURIComponent(deactivationReason.trim())}`
        : `/api/residents/${deactivatingResident.id}`;
      await api(url, { method: 'DELETE' });
      showToast({ type: 'success', message: 'Resident deactivated successfully.' });
      setDeactivatingResident(null);
      setDeactivationReason('');
      fetchResidents();
    } catch (err) {
      setError(err.message || 'Failed to deactivate resident.');
      showToast({ type: 'danger', message: 'Failed to deactivate resident.' });
    } finally { setActionLoading(false); }
  };

  const renderSkeletonRows = () => (
    <tr><td colSpan={7} style={{ padding: 0, border: 'none' }}><SkeletonList count={5} variant="row" /></td></tr>
  );

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Resident directory' },
  ];

  return (
    <div className="page-stack" style={{ animation: 'fadeInUp 0.3s ease backwards' }}>
      <Breadcrumb items={breadcrumbItems} />
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">Resident directory</h1>
          <p className="page-subtitle">
            {isBHW
              ? `Verified health profiles for your assigned Purok (${assignedZones.join(', ')}).`
              : 'Verified health profiles for every household in Barangay Tago.'}
          </p>
        </div>
        <div className="page-actions">
          {isBHW && (<Link to="/households/new"><Button variant="primary" iconLeft={Icons.plus}>Encode household</Button></Link>)}
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <PurokStrip
        zones={ZONES}
        counts={purokCounts}
        assignedZones={assignedZones}
        loading={countsLoading}
      />

      <div className="toolbar" style={{ paddingBottom: '1rem' }}>
        <form onSubmit={handleSearchSubmit} className="toolbar-search">
          <label htmlFor="search_q" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>Search residents</label>
          <div className="search-field">
            <span className="search-field-icon">{Icons.search}</span>
            <Input id="search_q" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
            {q && (<button type="button" onClick={() => { setQ(''); setPage(1); }} className="search-field-clear" aria-label="Clear search">{Icons.close}</button>)}
          </div>
        </form>

        <select className="form-select" style={{ width: 'auto', minWidth: '170px' }} value={selectedZone} onChange={(e) => { setSelectedZone(e.target.value); setPage(1); }} aria-label="Filter by purok">
          <option value="">All puroks in scope</option>
          {ZONES.map((z) => {
            const canAccess = !isBHW || assignedZones.includes(z.id);
            if (!canAccess) return null;
            return <option key={z.id} value={z.id}>{z.name}</option>;
          })}
        </select>

        <select className="form-select" style={{ width: 'auto', minWidth: '190px' }} value={ageGroup} onChange={(e) => { setAgeGroup(e.target.value); setPage(1); }} aria-label="Filter by target group">
          <option value="">All target groups</option>
          {Object.entries(AGE_RISK_GROUPS).map(([code, label]) => (<option key={code} value={code}>{label}</option>))}
        </select>

        {(q || selectedZone || ageGroup) && (
          <Button variant="secondary" onClick={handleResetFilters}>Clear filters</Button>
        )}

        <div className="seg-control" style={{ width: 'auto' }} role="group" aria-label="Group residents by">
          <button type="button" className={`seg-btn ${groupBy === 'household' ? 'on-f' : ''}`} aria-pressed={groupBy === 'household'} onClick={() => handleGroupByChange('household')}>By household</button>
          <button type="button" className={`seg-btn ${groupBy === 'name' ? 'on-f' : ''}`} aria-pressed={groupBy === 'name'} onClick={() => handleGroupByChange('name')}>By name</button>
        </div>

        <span className="toolbar-meta">
          {groupBy === 'household' ? (
            <><strong>{totalHouseholds}</strong> {totalHouseholds === 1 ? 'household' : 'households'} · <strong>{totalResidents}</strong> {totalResidents === 1 ? 'resident' : 'residents'}</>
          ) : (
            <><strong>{total}</strong> {total === 1 ? 'resident' : 'residents'}</>
          )}
        </span>
      </div>

      <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '290px' }}>Resident</th>
                <th style={{ width: '175px' }}>Household no.</th>
                <th style={{ width: '100px' }}>Purok</th>
                <th style={{ width: '80px' }} className="num">Age</th>
                <th style={{ width: '90px' }}>Sex</th>
                <th style={{ width: '190px' }}>Target group</th>
                <th style={{ width: '170px' }}>Health flags</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? renderSkeletonRows() : residents.length === 0 ? (
                <tr><td colSpan={8}><EmptyState title="No residents found" description="No resident records matched the current filters." action={handleResetFilters} actionLabel="Clear filters" /></td></tr>
              ) : (
                tableRows.map((row) => {
                  if (row.kind === 'group') {
                    return (
                      <tr key={`hh-${row.household_id}`} className="group-row">
                        <td colSpan={3}>
                          <button type="button" className="group-link" onClick={() => openHousehold(row.household_id)}>
                            {Icons.household}
                            <code>{row.household_no}</code>
                            <span className="group-meta">{row.zone_name}</span>
                            <span className="group-meta">
                              {row.shown_count === row.member_count
                                ? `${row.member_count} ${row.member_count === 1 ? 'member' : 'members'}`
                                : `${row.shown_count} of ${row.member_count} members shown`}
                            </span>
                          </button>
                        </td>
                        <td colSpan={4} className="group-tail" />
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openHousehold(row.household_id)}>Open household</button>
                        </td>
                      </tr>
                    );
                  }
                  const r = row.resident;
                  return (
                    <tr key={r.id} className="member-row">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div className="avatar-cell">{(r.first_name || '?').charAt(0).toUpperCase()}</div>
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ color: 'var(--text-heading)', fontSize: 'var(--fs-sm)', display: 'block', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.last_name}, {r.first_name} {r.middle_name || ''}</strong>
                            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--muted)', marginTop: '1px' }}>
                              {r.relation_to_head === 'HEAD'
                                ? <span style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>Head of household</span>
                                : <span style={{ textTransform: 'capitalize' }}>{String(r.relation_to_head || '').toLowerCase().replace(/_/g, ' ')}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{groupBy === 'household' ? <span style={{ color: 'var(--faint)' }}>—</span> : <code>{r.household_no}</code>}</td>
                      <td><span style={{ color: 'var(--muted)' }}>{r.zone_name}</span></td>
                      <td className="num">{r.age_years}<span style={{ color: 'var(--faint)' }}> yrs</span></td>
                      <td><span style={{ color: 'var(--muted)' }}>{r.sex === 'M' ? 'Male' : 'Female'}</span></td>
                      <td><span style={{ color: 'var(--muted)' }} title={AGE_RISK_GROUPS[r.age_risk_group] || r.age_risk_group}>{AGE_GROUP_SHORT[r.age_risk_group] || r.age_risk_group}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {r.is_pregnant && <span className="badge badge-rose">Pregnant</span>}
                          {(r.medical_conditions || []).map((c, i) => (<span key={i} className="badge badge-amber">{c.condition_code}</span>))}
                          {r.is_pwd && <span className="badge badge-slate">PWD</span>}
                          {r.uses_fp && <span className="badge badge-slate">Family planning</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="row-actions">
                          <IconButton icon={Icons.view} onClick={() => setViewingResident(r)} title="View profile" size="lg" />
                          {isBHW && (<><IconButton icon={Icons.edit} onClick={() => handleOpenEdit(r)} title="Edit record" size="lg" /><IconButton icon={Icons.trash} onClick={() => setDeactivatingResident(r)} title="Deactivate record" size="lg" /></>)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          unit={groupBy === 'household' ? 'households' : 'residents'}
          onPageChange={(p) => setPage(p)}
        />

      <Modal
        isOpen={!!viewingHousehold}
        onClose={() => setViewingHousehold(null)}
        title={viewingHousehold ? `Household ${viewingHousehold.household_no}` : 'Household'}
        subtitle={viewingHousehold
          ? `${viewingHousehold.zone_name} · ${viewingHousehold.members.length} ${viewingHousehold.members.length === 1 ? 'member' : 'members'} · visited ${viewingHousehold.date_of_visit}`
          : ''}
        isLarge
        footer={
          <Button variant="secondary" type="button" onClick={() => setViewingHousehold(null)}>Close</Button>
        }
      >
        {viewingHousehold && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="kv-grid">
              <div className="kv"><span className="kv-label">Address</span><span className="kv-value">{viewingHousehold.address_line || 'Not stated'}</span></div>
              <div className="kv"><span className="kv-label">Barangay</span><span className="kv-value">{viewingHousehold.barangay}, {viewingHousehold.municipality_city}</span></div>
              <div className="kv"><span className="kv-label">Water source</span><span className="kv-value">{WATER_SOURCES.find((w) => w.code === viewingHousehold.water_source_code)?.label || 'Not stated'}</span></div>
              <div className="kv"><span className="kv-label">Toilet facility</span><span className="kv-value">{TOILET_FACILITIES.find((t) => t.code === viewingHousehold.toilet_facility_code)?.label || 'Not stated'}</span></div>
              <div className="kv"><span className="kv-label">4Ps household</span><span className="kv-value">{viewingHousehold.is_4ps_household ? `Yes${viewingHousehold.fourps_household_id ? ` · ${viewingHousehold.fourps_household_id}` : ''}` : 'No'}</span></div>
              <div className="kv"><span className="kv-label">Reviewed by</span><span className="kv-value">{viewingHousehold.reviewed_by_name || 'Pending review'}</span></div>
            </div>

            <div className="panel">
              <div className="panel-head">Family members ({viewingHousehold.members.length})</div>
              <div className="panel-body" style={{ padding: 0 }}>
                <table className="table" style={{ fontSize: 'var(--fs-sm)' }}>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th style={{ width: '130px' }}>Relation</th>
                      <th style={{ width: '80px' }} className="num">Age</th>
                      <th style={{ width: '90px' }}>Sex</th>
                      <th style={{ width: '190px' }}>Target group</th>
                      <th style={{ width: '170px' }}>Health flags</th>
                      {isBHW && <th style={{ width: '110px', textAlign: 'right' }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {viewingHousehold.members.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <strong style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{m.last_name}, {m.first_name} {m.middle_name || ''}</strong>
                        </td>
                        <td><span style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>{String(m.relation_to_head || '').toLowerCase().replace(/_/g, ' ')}</span></td>
                        <td className="num">{m.age_years}<span style={{ color: 'var(--faint)' }}> yrs</span></td>
                        <td><span style={{ color: 'var(--muted)' }}>{m.sex === 'M' ? 'Male' : 'Female'}</span></td>
                        <td><span style={{ color: 'var(--muted)' }}>{AGE_GROUP_SHORT[m.age_risk_group] || m.age_risk_group}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {m.is_pregnant && <span className="badge badge-rose">Pregnant</span>}
                            {(m.medical_conditions || []).map((c, i) => (<span key={i} className="badge badge-amber">{c.condition_code}</span>))}
                            {m.is_pwd && <span className="badge badge-slate">PWD</span>}
                          </div>
                        </td>
                        {isBHW && (
                          <td style={{ textAlign: 'right' }}>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setViewingHousehold(null); handleOpenEdit(m); }}>Edit</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!viewingResident}
        onClose={() => setViewingResident(null)}
        title="Resident profile details"
        subtitle={`Health record #${viewingResident?.id || ''}`}
        isLarge
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setViewingResident(null)}>Close</Button>
            {isBHW && (
              <Button variant="primary" type="button" onClick={() => { const t = viewingResident; setViewingResident(null); handleOpenEdit(t); }}>Edit profile</Button>
            )}
          </>
        }
      >
        {viewingResident && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="kv-grid">
              <div className="kv"><span className="kv-label">Full name</span><span className="kv-value strong">{viewingResident.last_name}, {viewingResident.first_name} {viewingResident.middle_name || ''}</span></div>
              <div className="kv"><span className="kv-label">Household number</span><span className="kv-value"><code>{viewingResident.household_no}</code></span></div>
              <div className="kv"><span className="kv-label">Assigned purok</span><span className="kv-value">{viewingResident.zone_name}</span></div>
              <div className="kv"><span className="kv-label">Relation to head</span><span className="kv-value">{RELATIONS_TO_HEAD.find((x) => x.code === viewingResident.relation_to_head)?.label || viewingResident.relation_to_head}</span></div>
              <div className="kv"><span className="kv-label">Birth date</span><span className="kv-value">{viewingResident.birth_date}</span></div>
              <div className="kv"><span className="kv-label">Age</span><span className="kv-value">{viewingResident.age_years} yrs, {viewingResident.age_months} mos</span></div>
              <div className="kv"><span className="kv-label">Sex</span><span className="kv-value">{viewingResident.sex === 'M' ? 'Male' : 'Female'}</span></div>
              <div className="kv"><span className="kv-label">Civil status</span><span className="kv-value">{CIVIL_STATUSES.find((x) => x.code === viewingResident.civil_status_code)?.label || viewingResident.civil_status_code}</span></div>
              <div className="kv"><span className="kv-label">Education</span><span className="kv-value">{EDUCATION_LEVELS.find((x) => x.code === viewingResident.education_code)?.label || viewingResident.education_code}</span></div>
              <div className="kv"><span className="kv-label">Occupation</span><span className="kv-value">{viewingResident.occupation || 'Not stated'}</span></div>
              <div className="kv"><span className="kv-label">PhilHealth ID</span><span className="kv-value">{viewingResident.philhealth_id || 'Not enrolled'}</span></div>
              <div className="kv"><span className="kv-label">Target group</span><span className="kv-value">{AGE_RISK_GROUPS[viewingResident.age_risk_group] || viewingResident.age_risk_group}</span></div>
            </div>

            <div className="panel">
              <div className="panel-head">Health and program status</div>
              <div className="panel-body">
                <div className="kv-grid">
                  <div className="kv"><span className="kv-label">Pregnancy</span><span className="kv-value">{viewingResident.is_pregnant ? `Yes, LMP ${viewingResident.lmp_date || 'not recorded'}` : 'No'}</span></div>
                  <div className="kv"><span className="kv-label">Family planning</span><span className="kv-value">{viewingResident.uses_fp ? `Active, ${viewingResident.fp_method_code}` : 'Not using'}</span></div>
                  <div className="kv"><span className="kv-label">PWD</span><span className="kv-value">{viewingResident.is_pwd ? (viewingResident.disability_type || viewingResident.disability_type_code) : 'No'}</span></div>
                  <div className="kv"><span className="kv-label">Chronic conditions</span><span className="kv-value">{(viewingResident.medical_conditions && viewingResident.medical_conditions.length > 0) ? viewingResident.medical_conditions.map((c) => c.condition_code).join(', ') : 'None recorded'}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!editingResident}
        onClose={() => setEditingResident(null)}
        title="Edit resident record"
        subtitle={`Updating ${editingResident?.first_name || ''} ${editingResident?.last_name || ''}`}
        isLarge
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setEditingResident(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form="resident-edit-form" disabled={actionLoading}>{actionLoading ? 'Saving...' : 'Save changes'}</Button>
          </>
        }
      >
        {editingResident && (
          <form id="resident-edit-form" onSubmit={handleSaveEdit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <FormGrid cols={3}>
                <FormGroup label="Last name" required><Input type="text" value={editingResident.last_name} onChange={(e) => setEditingResident({ ...editingResident, last_name: e.target.value })} required /></FormGroup>
                <FormGroup label="First name" required><Input type="text" value={editingResident.first_name} onChange={(e) => setEditingResident({ ...editingResident, first_name: e.target.value })} required /></FormGroup>
                <FormGroup label="Middle name"><Input type="text" value={editingResident.middle_name || ''} onChange={(e) => setEditingResident({ ...editingResident, middle_name: e.target.value })} /></FormGroup>
                <FormGroup label="Relation to head" required>
                  <select className="form-select" value={editingResident.relation_to_head} onChange={(e) => setEditingResident({ ...editingResident, relation_to_head: e.target.value })} required>
                    {RELATIONS_TO_HEAD.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="Civil status" required>
                  <select className="form-select" value={editingResident.civil_status_code} onChange={(e) => setEditingResident({ ...editingResident, civil_status_code: e.target.value })} required>
                    {CIVIL_STATUSES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="Education" required>
                  <select className="form-select" value={editingResident.education_code} onChange={(e) => setEditingResident({ ...editingResident, education_code: e.target.value })} required>
                    {EDUCATION_LEVELS.map((ed) => <option key={ed.code} value={ed.code}>{ed.label}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="Occupation"><Input type="text" value={editingResident.occupation || ''} onChange={(e) => setEditingResident({ ...editingResident, occupation: e.target.value })} /></FormGroup>
                <FormGroup label="PhilHealth ID (12 digits)"><Input type="text" maxLength={12} value={editingResident.philhealth_id || ''} onChange={(e) => setEditingResident({ ...editingResident, philhealth_id: e.target.value })} placeholder="e.g. 123456789012" /></FormGroup>
              </FormGrid>

              {editingResident.sex === 'F' && (
                <div className="panel">
                  <div className="panel-head">Maternal and reproductive health</div>
                  <div className="panel-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                      <label className="form-check" style={{ marginBottom: 0 }}><input type="checkbox" checked={editingResident.is_pregnant} onChange={(e) => setEditingResident({ ...editingResident, is_pregnant: e.target.checked })} /><span className="form-check-label">Currently pregnant</span></label>
                      {editingResident.is_pregnant && (
                        <FormGroup label="LMP date" required><Input type="date" value={editingResident.lmp_date || ''} onChange={(e) => setEditingResident({ ...editingResident, lmp_date: e.target.value })} required /></FormGroup>
                      )}
                      <label className="form-check" style={{ marginBottom: 0 }}><input type="checkbox" checked={editingResident.uses_fp} onChange={(e) => setEditingResident({ ...editingResident, uses_fp: e.target.checked })} /><span className="form-check-label">Uses family planning</span></label>
                      {editingResident.uses_fp && (
                        <FormGroup label="FP method" required>
                          <select className="form-select" value={editingResident.fp_method_code || ''} onChange={(e) => setEditingResident({ ...editingResident, fp_method_code: e.target.value })} required>
                            <option value="">-- Select method --</option>
                            {FP_METHODS.map((fp) => <option key={fp.code} value={fp.code}>{fp.label}</option>)}
                          </select>
                        </FormGroup>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="panel">
                <div className="panel-head">Disability (PWD)</div>
                <div className="panel-body">
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
                    <label className="form-check" style={{ marginBottom: 0 }}><input type="checkbox" checked={editingResident.is_pwd} onChange={(e) => setEditingResident({ ...editingResident, is_pwd: e.target.checked })} /><span className="form-check-label">Person with disability</span></label>
                    {editingResident.is_pwd && (
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <FormGroup label="Disability type" required>
                          <select className="form-select" value={editingResident.disability_type_code || ''} onChange={(e) => setEditingResident({ ...editingResident, disability_type_code: e.target.value })} required={editingResident.is_pwd}>
                            <option value="">-- Select --</option>
                            {DISABILITY_TYPES.map((d) => <option key={d.code} value={d.code}>{d.label}</option>)}
                          </select>
                        </FormGroup>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '0' }}>
                <label className="form-label" style={{ marginBottom: '0.6rem' }}>Diagnosed medical conditions</label>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {MEDICAL_CONDITIONS.map((cond) => {
                  const checked = (editingResident.medical_conditions || []).includes(cond.code);
                  return (
                    <div key={cond.code} className={`condition-chip ${checked ? 'active' : ''}`} onClick={() => {
                      const list = editingResident.medical_conditions || [];
                      const updated = checked ? list.filter((c) => c !== cond.code) : [...list, cond.code];
                      setEditingResident({ ...editingResident, medical_conditions: updated });
                    }}>
                      <span className="chip-mark">{checked ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span>
                      <span>{cond.label}</span>
                    </div>
                  );
                })}
              </div>
              {(editingResident.medical_conditions || []).includes('OTH') && (
                <div style={{ marginTop: '0.75rem', maxWidth: '360px' }}>
                  <Input type="text" placeholder="Specify other condition" value={editingResident.other_condition_specify} onChange={(e) => setEditingResident({ ...editingResident, other_condition_specify: e.target.value })} required />
                </div>
              )}
            </div>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={!!deactivatingResident}
        onClose={() => setDeactivatingResident(null)}
        title="Confirm deactivation"
        subtitle="Permanent deletion is prohibited by audit rules."
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setDeactivatingResident(null)} disabled={actionLoading}>Cancel</Button>
            <Button variant="danger" type="button" onClick={handleConfirmDeactivate} disabled={actionLoading}>{actionLoading ? 'Deactivating...' : 'Confirm deactivate'}</Button>
          </>
        }
      >
        {deactivatingResident && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="notice notice-danger">
              <Trash2 className="h-[18px] w-[18px] shrink-0" style={{ color: 'var(--negative)' }} />
              <div>
                <h4 style={{ color: 'var(--pill-negative-ink)', fontSize: 'var(--fs-base)', fontWeight: 600 }}>Deactivate {deactivatingResident.first_name} {deactivatingResident.last_name}?</h4>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--pill-negative-ink)', marginTop: '3px', lineHeight: 1.5 }}>This sets <code>is_active = false</code> and removes the resident from active masterlists. The record and its audit trail are kept.</p>
              </div>
            </div>
            <FormGroup label="Reason for deactivation (optional audit note)">
              <Input id="deact_reason" placeholder="e.g. Relocated, Deceased, Transfer" value={deactivationReason} onChange={(e) => setDeactivationReason(e.target.value)} maxLength={200} />
            </FormGroup>
          </div>
        )}
      </Modal>
    </div>
  );
}
