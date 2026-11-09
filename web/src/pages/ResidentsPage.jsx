import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { Alert } from '../components/Alert.jsx';
import { Modal } from '../components/Modal.jsx';
import { Pagination } from '../components/Pagination.jsx';
import { Skeleton, SkeletonList } from '../components/Skeleton.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PurokStrip } from '../components/Card.jsx';
import { Button, IconButton } from '../components/Button.jsx';
import { Input, FormGroup, FormGrid } from '../components/Form.jsx';
import { showToast } from '../components/Toast.jsx';
import { ResidentHistory } from '../components/ResidentHistory.jsx';
import {
  ZONES, AGE_RISK_GROUPS, RELATIONS_TO_HEAD, CIVIL_STATUSES,
  EDUCATION_LEVELS, MEDICAL_CONDITIONS, DISABILITY_TYPES, FP_METHODS,
  WATER_SOURCES, TOILET_FACILITIES, AGE_GROUP_SHORT, ageGroupChip, residentTab,
} from '../constants.js';
import { Plus, Search, Eye, Pencil, UserX, X, Check, Home, Archive, RotateCcw } from 'lucide-react';

const CONDITION_NAME = { HPN: 'Hypertension', DM: 'Diabetes', TB: 'Tuberculosis' };

const Icons = {
  plus: <Plus className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  view: <Eye className="h-4 w-4" />,
  edit: <Pencil className="h-4 w-4" />,
  trash: <UserX className="h-4 w-4" />,
  close: <X className="h-4 w-4" />,
  closeSm: <X className="h-3.5 w-3.5" />,
  household: <Home className="h-4 w-4" />,
  archive: <Archive className="h-4 w-4" />,
  restore: <RotateCcw className="h-4 w-4" />,
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

  /* Links from Home can open this page already filtered: ?q=name, ?zone=id */
  const [searchParams] = useSearchParams();
  const initialZone = (() => {
    const z = Number(searchParams.get('zone'));
    if (!ZONES.some((x) => x.id === z)) return '';
    return !isBHW || assignedZones.includes(z) ? String(z) : '';
  })();
  const [q, setQ] = useState(() => searchParams.get('q') || '');
  const [selectedZone, setSelectedZone] = useState(initialZone);
  const [ageGroup, setAgeGroup] = useState('');
  const [groupBy, setGroupBy] = useState('household');
  /* 'active' is the working list; 'archived' shows deactivated residents (read-only, BHW can restore). */
  const [view, setView] = useState('active');
  const archived = view === 'archived';
  const effGroupBy = archived ? 'name' : groupBy;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalResidents, setTotalResidents] = useState(0);
  const [totalHouseholds, setTotalHouseholds] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const listTopRef = React.useRef(null);
  /* New page: bring the top of the list back into view. */
  const changePage = (p) => {
    setPage(p);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const [viewingResident, setViewingResident] = useState(null);
  const [editingResident, setEditingResident] = useState(null);
  const [deactivatingResident, setDeactivatingResident] = useState(null);
  const [deactivationReason, setDeactivationReason] = useState('');
  const [restoringResident, setRestoringResident] = useState(null);
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
      params.set('group_by', effGroupBy);
      if (archived) params.set('status', 'archived');
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      const data = await api(`/api/residents?${params.toString()}`);
      setResidents(data.items || []);
      setTotal(data.total || 0);
      setTotalResidents(data.total_residents ?? data.total ?? 0);
      setTotalHouseholds(data.total_households ?? 0);
    } catch (err) {
      setError(err.message || 'Failed to load residents.');
      showToast({ type: 'danger', message: archived ? 'Failed to load the archive.' : 'Failed to load residents.' });
    } finally { setLoading(false); }
  }, [q, selectedZone, ageGroup, effGroupBy, archived, page, pageSize]);

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
  const handleViewChange = (value) => { setView(value); setPage(1); setError(''); };

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
    if (effGroupBy !== 'household') {
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
          family: (residents.find((x) => x.household_id === r.household_id && x.relation_to_head === 'HEAD') || r).last_name,
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

  const handleConfirmRestore = async () => {
    if (!restoringResident) return;
    setActionLoading(true);
    setError('');
    try {
      await api(`/api/residents/${restoringResident.id}/reactivate`, { method: 'POST' });
      showToast({ type: 'success', message: `${restoringResident.first_name} ${restoringResident.last_name} was restored.` });
      setRestoringResident(null);
      setViewingResident(null);
      fetchResidents();
      fetchPurokCounts();
    } catch (err) {
      const message = err.message || 'Failed to restore resident.';
      setRestoringResident(null);
      setError(message);
      showToast({ type: 'danger', message });
    } finally { setActionLoading(false); }
  };

  /* Health notes in plain words, so nobody has to decode HPN or FP. */
  /* "1959-03-14" -> "14 Mar 1959" */
  const fmtDate = (iso) => {
    if (!iso) return null;
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  /* Timestamps from the API (archived date) -> "14 Mar 2026" */
  const fmtStamp = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const relationLabel = (code) => RELATIONS_TO_HEAD.find((x) => x.code === code)?.label || code;
  const ageText = (r) => (r.age_years > 0 ? `${r.age_years} yrs` : `${r.age_months ?? 0} mos`);
  const Row = ({ label, children, muted }) => (
    <div className="info-row"><dt>{label}</dt><dd className={muted ? 'is-muted' : ''}>{children}</dd></div>
  );
  const flagsFor = (r, withFp = true) => {
    const conditions = r.medical_conditions || [];
    const any = r.is_pregnant || r.is_pwd || conditions.length > 0 || (withFp && r.uses_fp);
    if (!any) return <span className="flags-none">None recorded</span>;
    return (
      <div className="flags">
        {r.is_pregnant && <span className="flag flag-maternal">Pregnant</span>}
        {r.is_pwd && <span className="flag flag-pwd">With disability</span>}
        {conditions.map((c, i) => (
          <span key={i} className="flag flag-condition" title={MEDICAL_CONDITIONS.find((m) => m.code === c.condition_code)?.label}>
            {CONDITION_NAME[c.condition_code] || c.other_specify || 'Other condition'}
          </span>
        ))}
        {withFp && r.uses_fp && <span className="flag flag-soft">Family planning</span>}
      </div>
    );
  };

  const groupChip = (code) => (
    <span className={`pchip ${ageGroupChip(code)}`} title={AGE_RISK_GROUPS[code] || code}>{AGE_GROUP_SHORT[code] || code}</span>
  );

  const byHousehold = effGroupBy === 'household';
  const colCount = archived ? 6 : byHousehold ? 6 : 8;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">{archived ? 'Archived residents' : 'Residents'}</h1>
          <p className="page-subtitle">
            {archived
              ? (isBHW ? 'Residents you deactivated in your puroks. Restore one if they came back or it was a mistake.' : 'Deactivated residents of all puroks, kept for the record. Read-only.')
              : isBHW
              ? (assignedZones.length > 1
                ? `Residents of your puroks (${assignedZones.map((id) => `Purok ${id}`).join(', ')}), by household.`
                : `Residents of Purok ${assignedZones[0] ?? ''}, by household.`)
              : 'All registered residents of Barangay Tago, by purok and household.'}
          </p>
        </div>
        <div className="page-actions">
          <div className="seg-control" role="group" aria-label="Which residents">
            <button type="button" className={`seg-btn ${!archived ? 'on' : ''}`} aria-pressed={!archived} onClick={() => handleViewChange('active')}>Active</button>
            <button type="button" className={`seg-btn ${archived ? 'on' : ''}`} aria-pressed={archived} onClick={() => handleViewChange('archived')}>{Icons.archive} Archived</button>
          </div>
          {isBHW && !archived && (<Link to="/households/new"><Button variant="primary" iconLeft={Icons.plus}>Encode household</Button></Link>)}
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {/* Midwife: purok cards across all puroks. Health workers pick from the filter bar instead. */}
      {!isBHW && !archived && (
        <PurokStrip
          zones={ZONES}
          counts={purokCounts}
          loading={countsLoading}
          selected={selectedZone}
          onSelect={(z) => { setSelectedZone(z); setPage(1); }}
        />
      )}

      <div className="toolbar">
        <form onSubmit={handleSearchSubmit} className="toolbar-search" role="search">
          <label htmlFor="search_q" className="sr-only">Search residents</label>
          <div className="input-affix has-btn">
            <span className="affix-icon">{Icons.search}</span>
            <Input id="search_q" placeholder="Search by name" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            {q && (<button type="button" onClick={() => { setQ(''); setPage(1); }} className="affix-btn" aria-label="Clear search">{Icons.close}</button>)}
          </div>
        </form>

        {/* Health worker with several puroks: a plain dropdown. One purok needs no choice. */}
        {isBHW && assignedZones.length > 1 && (
          <select className="form-select" value={selectedZone} onChange={(e) => { setSelectedZone(e.target.value); setPage(1); }} aria-label="Filter by purok">
            <option value="">All my puroks{countsLoading ? '' : ` (${assignedZones.reduce((n, id) => n + (purokCounts[id] || 0), 0)})`}</option>
            {ZONES.filter((z) => assignedZones.includes(z.id)).map((z) => (
              <option key={z.id} value={z.id}>{z.name}{countsLoading || purokCounts[z.id] === undefined ? '' : ` (${purokCounts[z.id]})`}</option>
            ))}
          </select>
        )}

        <select className="form-select" value={ageGroup} onChange={(e) => { setAgeGroup(e.target.value); setPage(1); }} aria-label="Filter by target group">
          <option value="">All target groups</option>
          {Object.entries(AGE_RISK_GROUPS).map(([code, label]) => (<option key={code} value={code}>{label}</option>))}
        </select>

        {!archived && (<div className="seg-control" role="group" aria-label="Group residents by">
          <button type="button" className={`seg-btn ${byHousehold ? 'on' : ''}`} aria-pressed={byHousehold} onClick={() => handleGroupByChange('household')}>By household</button>
          <button type="button" className={`seg-btn ${!byHousehold ? 'on' : ''}`} aria-pressed={!byHousehold} onClick={() => handleGroupByChange('name')}>By name</button>
        </div>)}

        {(q || selectedZone || ageGroup) && (
          <Button variant="ghost" onClick={handleResetFilters} className="full">Clear filters</Button>
        )}

        <span className="toolbar-meta">
          {archived ? (
            <><strong>{total}</strong> archived {total === 1 ? 'resident' : 'residents'}</>
          ) : byHousehold ? (
            <><strong>{totalHouseholds}</strong> {totalHouseholds === 1 ? 'household' : 'households'}, <strong>{totalResidents}</strong> {totalResidents === 1 ? 'resident' : 'residents'}</>
          ) : (
            <><strong>{total}</strong> {total === 1 ? 'resident' : 'residents'}</>
          )}
        </span>
      </div>

      <div className="table-card" ref={listTopRef} style={{ scrollMarginTop: 'calc(var(--topbar-height) + 1rem)' }}>
        <div className="table-wrap">
          <table className="table table-stack">
            <thead>
              <tr>
                <th className="col-name">Resident</th>
                {!byHousehold && <th>Household no.</th>}
                {!byHousehold && <th>Purok</th>}
                <th className="col-age">Age and sex</th>
                {archived ? <th>Archived</th> : <th className="col-group">Target group</th>}
                {!archived && <th>Health notes</th>}
                {!archived && <th className="col-updated">Last updated</th>}
                <th className="col-actions"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={colCount} style={{ padding: '0.5rem 0' }}><SkeletonList count={6} variant="row" /></td></tr>
              ) : residents.length === 0 ? (
                <tr><td colSpan={colCount}>{archived && !q && !selectedZone && !ageGroup
                  ? <EmptyState title="No archived residents" description="Nobody has been deactivated yet. Residents you deactivate will be listed here." />
                  : <EmptyState title={archived ? 'No archived residents match' : 'No residents match'} description="Try another name, purok, or target group." action={handleResetFilters} actionLabel="Clear filters" />}</td></tr>
              ) : (
                tableRows.map((row) => {
                  if (row.kind === 'group') {
                    return (
                      <tr key={`hh-${row.household_id}`} className="group-row">
                        <td colSpan={colCount - 1}>
                          <button type="button" className="group-link" onClick={() => openHousehold(row.household_id)} disabled={householdLoading}>
                            {Icons.household}
                            <strong className="group-family">{row.family ? `${row.family} household` : 'Household'}</strong>
                            <code className="group-meta">{row.household_no}</code>
                            <span className="group-meta">{row.zone_name}</span>
                            <span className="group-meta">
                              {row.shown_count === row.member_count
                                ? `${row.member_count} ${row.member_count === 1 ? 'member' : 'members'}`
                                : `${row.shown_count} of ${row.member_count} members shown`}
                            </span>
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openHousehold(row.household_id)}>Open household</button>
                        </td>
                      </tr>
                    );
                  }
                  const r = row.resident;
                  return (
                    <tr key={r.id} className="row-click" onClick={(e) => { if (!e.target.closest('button')) setViewingResident(r); }}>
                      <td className="cell-name">
                        <strong>{r.last_name}, {r.first_name} {r.middle_name || ''}</strong>
                        {r.relation_to_head === 'HEAD'
                          ? <span className="is-head">Head of household</span>
                          : <span>{RELATIONS_TO_HEAD.find((x) => x.code === r.relation_to_head)?.label || r.relation_to_head}</span>}
                      </td>
                      {!byHousehold && <td><code>{r.household_no}</code></td>}
                      {!byHousehold && <td className="muted">{r.zone_name}</td>}
                      <td className="cell-age">
                        <strong>{r.age_years > 0 ? `${r.age_years} yrs` : `${r.age_months ?? 0} mos`}</strong>
                        <span>{r.sex === 'M' ? 'Male' : 'Female'}</span>
                      </td>
                      {archived ? (
                        <td className="cell-notes">
                          <strong>{fmtStamp(r.deactivated_at) || 'Unknown date'}</strong>
                          <span className="muted"> by {r.deactivated_by_name || 'unknown'}</span>
                          <span className="muted" style={{ display: 'block' }}>{r.deactivation_reason ? `Reason: ${r.deactivation_reason}` : 'No reason given'}</span>
                        </td>
                      ) : (
                        <>
                          <td>{groupChip(r.age_risk_group)}</td>
                          <td className="cell-notes">{flagsFor(r)}</td>
                          <td className="cell-updated">
                            <strong>{fmtStamp(r.updated_at) || '–'}</strong>
                            <span>by {r.updated_by_name || 'unknown'}</span>
                          </td>
                        </>
                      )}
                      <td>
                        <div className="row-actions">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setViewingResident(r)} aria-label={`View profile of ${r.first_name} ${r.last_name}`}>View</button>
                          {isBHW && (archived
                            ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRestoringResident(r)} aria-label={`Restore ${r.first_name} ${r.last_name}`}>{Icons.restore} Restore</button>
                            : <><IconButton icon={Icons.edit} onClick={() => handleOpenEdit(r)} title="Edit record" /><IconButton icon={Icons.trash} onClick={() => setDeactivatingResident(r)} title="Deactivate (moved out or deceased)" variant="ghost-danger" /></>)}
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
          unit={byHousehold ? 'households' : 'residents'}
          onPageChange={changePage}
          pageSizeOptions={[10, 15, 25, 50]}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        />
      </div>

      <Modal
        isOpen={!!viewingHousehold}
        onClose={() => setViewingHousehold(null)}
        title={viewingHousehold
          ? `${(viewingHousehold.members.find((m) => m.relation_to_head === 'HEAD') || viewingHousehold.members[0] || {}).last_name || ''} household`.trim()
          : 'Household'}
        subtitle={viewingHousehold
          ? `${viewingHousehold.household_no} · ${viewingHousehold.zone_name} · ${viewingHousehold.members.length} ${viewingHousehold.members.length === 1 ? 'member' : 'members'} · visited ${fmtDate(viewingHousehold.date_of_visit)}`
          : ''}
        isLarge
        footer={
          <Button variant="secondary" type="button" onClick={() => setViewingHousehold(null)}>Close</Button>
        }
      >
        {viewingHousehold && (
          <div className="sheet-body">
            <section className="sheet-section">
              <h3>Home and facilities</h3>
              <dl className="info-list">
                <Row label="Address" muted={!viewingHousehold.address_line}>{viewingHousehold.address_line || 'Not stated'}</Row>
                <Row label="Barangay">{viewingHousehold.barangay}, {viewingHousehold.municipality_city}</Row>
                <Row label="Water source">{WATER_SOURCES.find((w) => w.code === viewingHousehold.water_source_code)?.label || 'Not stated'}</Row>
                <Row label="Toilet">{TOILET_FACILITIES.find((t) => t.code === viewingHousehold.toilet_facility_code)?.label || 'Not stated'}</Row>
                <Row label="4Ps household" muted={!viewingHousehold.is_4ps_household}>{viewingHousehold.is_4ps_household ? `Yes${viewingHousehold.fourps_household_id ? `, ${viewingHousehold.fourps_household_id}` : ''}` : 'No'}</Row>
                <Row label="Reviewed by" muted={!viewingHousehold.reviewed_by_name}>{viewingHousehold.reviewed_by_name || 'Pending review'}</Row>
              </dl>
            </section>

            <section className="sheet-section">
              <h3>Family members ({viewingHousehold.members.length})</h3>
              <div className="table-wrap sheet-table-wrap">
                <table className="table table-stack">
                  <thead>
                    <tr>
                      <th className="col-name">Member</th>
                      <th className="col-age">Age and sex</th>
                      <th className="col-group">Target group</th>
                      <th>Health notes</th>
                      <th className="col-actions"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingHousehold.members.map((m) => {
                      const member = { ...m, household_no: viewingHousehold.household_no, zone_name: viewingHousehold.zone_name };
                      return (
                        <tr key={m.id} className="row-click" onClick={(e) => { if (!e.target.closest('button')) { setViewingHousehold(null); setViewingResident(member); } }}>
                          <td className="cell-name">
                            <strong>{m.last_name}, {m.first_name} {m.middle_name || ''}</strong>
                            {m.relation_to_head === 'HEAD' ? <span className="is-head">Head of household</span> : <span>{relationLabel(m.relation_to_head)}</span>}
                          </td>
                          <td className="cell-age"><strong>{ageText(m)}</strong><span>{m.sex === 'M' ? 'Male' : 'Female'}</span></td>
                          <td>{groupChip(m.age_risk_group)}</td>
                          <td className="cell-notes">{flagsFor(m)}</td>
                          <td>
                            <div className="row-actions">
                              {isBHW
                                ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setViewingHousehold(null); handleOpenEdit(member); }}>Edit</button>
                                : <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setViewingHousehold(null); setViewingResident(member); }}>View</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!viewingResident}
        onClose={() => setViewingResident(null)}
        title={viewingResident ? `${viewingResident.last_name}, ${viewingResident.first_name} ${viewingResident.middle_name || ''}`.trim() : 'Resident profile'}
        subtitle={viewingResident ? `${viewingResident.zone_name} · ${viewingResident.household_no}` : ''}
        isLarge
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setViewingResident(null)}>Close</Button>
            {isBHW && viewingResident && viewingResident.is_active && (
              <Button variant="primary" type="button" onClick={() => { const t = viewingResident; setViewingResident(null); handleOpenEdit(t); }}>Edit profile</Button>
            )}
            {isBHW && viewingResident && !viewingResident.is_active && (
              <Button variant="primary" type="button" iconLeft={Icons.restore} onClick={() => setRestoringResident(viewingResident)}>Restore resident</Button>
            )}
          </>
        }
      >
        {viewingResident && (() => {
          const r = viewingResident;
          const conditions = (r.medical_conditions || []).map((c) => CONDITION_NAME[c.condition_code] || c.other_specify || 'Other condition');
          const fp = FP_METHODS.find((m) => m.code === r.fp_method_code)?.label || r.fp_method_code;
          return (
            <div className="sheet-body">
              {!r.is_active && (
                <div className="notice notice-info" role="status">
                  <Archive className="h-[18px] w-[18px] shrink-0" />
                  <div>
                    <strong>Archived {fmtStamp(r.deactivated_at) ? `on ${fmtStamp(r.deactivated_at)}` : ''} by {r.deactivated_by_name || 'unknown'}</strong>
                    <p style={{ fontSize: 'var(--fs-sm)', marginTop: '3px' }}>{r.deactivation_reason ? `Reason: ${r.deactivation_reason}` : 'No reason was given.'}</p>
                  </div>
                </div>
              )}
              <div className="sheet-summary">
                <span className="sheet-facts">{ageText(r)} · {r.sex === 'M' ? 'Male' : 'Female'} · {r.relation_to_head === 'HEAD' ? 'Head of household' : relationLabel(r.relation_to_head)}</span>
                <div className="flags">
                  {groupChip(r.age_risk_group)}
                  {r.is_pregnant && <span className="flag flag-maternal">Pregnant</span>}
                  {r.is_pwd && <span className="flag flag-pwd">With disability</span>}
                </div>
              </div>

              <section className="sheet-section">
                <h3>Health and programs</h3>
                <dl className="info-list">
                  <Row label="Pregnancy" muted={!r.is_pregnant}>{r.is_pregnant ? `Pregnant, last period ${fmtDate(r.lmp_date) || 'not recorded'}` : 'Not pregnant'}</Row>
                  <Row label="Family planning" muted={!r.uses_fp}>{r.uses_fp ? fp : 'Not using'}</Row>
                  <Row label="Disability" muted={!r.is_pwd}>{r.is_pwd ? (r.disability_type || r.disability_type_code) : 'None'}</Row>
                  <Row label="Conditions" muted={conditions.length === 0}>{conditions.length ? conditions.join(', ') : 'None recorded'}</Row>
                  <Row label="PhilHealth ID" muted={!r.philhealth_id}>{r.philhealth_id || 'Not enrolled'}</Row>
                </dl>
              </section>

              <section className="sheet-section">
                <h3>Household</h3>
                <dl className="info-list">
                  <Row label="Household no.">{r.household_no}</Row>
                  <Row label="Purok">{r.zone_name}</Row>
                  <Row label="Relation to head">{relationLabel(r.relation_to_head)}</Row>
                </dl>
              </section>

              <section className="sheet-section">
                <h3>Personal details</h3>
                <dl className="info-list">
                  <Row label="Full name">{r.last_name}, {r.first_name} {r.middle_name || ''}</Row>
                  <Row label="Birth date">{fmtDate(r.birth_date)} ({r.age_years} yrs, {r.age_months} mos)</Row>
                  <Row label="Civil status">{CIVIL_STATUSES.find((x) => x.code === r.civil_status_code)?.label || r.civil_status_code || 'Not stated'}</Row>
                  <Row label="Education">{EDUCATION_LEVELS.find((x) => x.code === r.education_code)?.label || r.education_code || 'Not stated'}</Row>
                  <Row label="Occupation" muted={!r.occupation}>{r.occupation || 'Not stated'}</Row>
                </dl>
              </section>

              <ResidentHistory residentId={r.id} />
            </div>
          );
        })()}
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
            <Button variant="primary" type="submit" form="resident-edit-form" disabled={actionLoading}>{actionLoading ? 'Saving…' : 'Save changes'}</Button>
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

              <fieldset style={{ marginTop: '0', border: 0, padding: 0, minWidth: 0 }}>
                <legend className="form-label" style={{ marginBottom: '0.6rem', padding: 0 }}>Diagnosed medical conditions</legend>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {MEDICAL_CONDITIONS.map((cond) => {
                  const checked = (editingResident.medical_conditions || []).includes(cond.code);
                  return (
                    <button type="button" key={cond.code} aria-pressed={checked} className={`condition-chip ${checked ? 'active' : ''}`} onClick={() => {
                      const list = editingResident.medical_conditions || [];
                      const updated = checked ? list.filter((c) => c !== cond.code) : [...list, cond.code];
                      setEditingResident({ ...editingResident, medical_conditions: updated });
                    }}>
                      <span className="chip-mark">{checked ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</span>
                      <span>{cond.label}</span>
                    </button>
                  );
                })}
              </div>
              {(editingResident.medical_conditions || []).includes('OTH') && (
                <div style={{ marginTop: '0.75rem', maxWidth: '360px' }}>
                  <Input type="text" aria-label="Specify other condition" placeholder="Specify other condition" value={editingResident.other_condition_specify} onChange={(e) => setEditingResident({ ...editingResident, other_condition_specify: e.target.value })} required />
                </div>
              )}
            </fieldset>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={!!deactivatingResident}
        onClose={() => setDeactivatingResident(null)}
        title="Deactivate this resident?"
        subtitle="Records are never deleted. They are marked inactive and kept for the audit trail."
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setDeactivatingResident(null)} disabled={actionLoading}>Cancel</Button>
            <Button variant="danger" type="button" onClick={handleConfirmDeactivate} disabled={actionLoading}>{actionLoading ? 'Deactivating…' : 'Deactivate resident'}</Button>
          </>
        }
      >
        {deactivatingResident && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="notice notice-danger">
              <UserX className="h-[18px] w-[18px] shrink-0" style={{ color: 'var(--negative)' }} />
              <div>
                <h4 style={{ fontSize: 'var(--fs-base)', fontWeight: 700 }}>Deactivate {deactivatingResident.first_name} {deactivatingResident.last_name}?</h4>
                <p style={{ fontSize: 'var(--fs-sm)', marginTop: '3px' }}>They will no longer appear in the resident list or the program masterlists. Their record and change history are kept.</p>
              </div>
            </div>
            <FormGroup label="Reason for deactivation (optional audit note)">
              <Input id="deact_reason" placeholder="e.g. Relocated, Deceased, Transfer" value={deactivationReason} onChange={(e) => setDeactivationReason(e.target.value)} maxLength={200} />
            </FormGroup>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!restoringResident}
        onClose={() => setRestoringResident(null)}
        title="Restore this resident?"
        subtitle="They return to the resident list and the program masterlists."
        footer={
          <>
            <Button variant="secondary" type="button" onClick={() => setRestoringResident(null)} disabled={actionLoading}>Cancel</Button>
            <Button variant="primary" type="button" onClick={handleConfirmRestore} loading={actionLoading}>{actionLoading ? 'Restoring…' : 'Restore resident'}</Button>
          </>
        }
      >
        {restoringResident && (
          <div className="notice notice-info">
            <RotateCcw className="h-[18px] w-[18px] shrink-0" />
            <div>
              <h4 style={{ fontSize: 'var(--fs-base)', fontWeight: 700 }}>Restore {restoringResident.first_name} {restoringResident.last_name}?</h4>
              <p style={{ fontSize: 'var(--fs-sm)', marginTop: '3px' }}>
                Archived {fmtStamp(restoringResident.deactivated_at) ? `on ${fmtStamp(restoringResident.deactivated_at)} ` : ''}by {restoringResident.deactivated_by_name || 'unknown'}
                {restoringResident.deactivation_reason ? `: ${restoringResident.deactivation_reason}.` : '.'} The restore is added to the change history with your name.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
