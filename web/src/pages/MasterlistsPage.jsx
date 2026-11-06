import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { Alert } from '../components/Alert.jsx';
import { SkeletonList } from '../components/Skeleton.jsx';
import { Button } from '../components/Button.jsx';
import { showToast } from '../components/Toast.jsx';
import { ZONES, MASTERLIST_CATEGORIES, CATEGORY_THEME } from '../constants.js';
import { Printer, Baby, HeartPulse, Accessibility, Users as UsersIcon, PenLine } from 'lucide-react';

const CATEGORY_ICON = { SENIOR_CITIZEN: UsersIcon, UNDER_FIVE: Baby, PREGNANT: HeartPulse, PWD: Accessibility };
const SHORT_LABEL = { SENIOR_CITIZEN: 'Senior citizens', UNDER_FIVE: 'Under-five children', PREGNANT: 'Pregnant women', PWD: 'Persons with disability' };

export function MasterlistsPage() {
  const { user } = useAuth();
  const isBHW = user?.role === 'BHW';
  const assignedZones = user?.zone_ids || [];
  const assignedKey = assignedZones.join(',');
  const defaultArea = isBHW ? `Assigned puroks (${assignedKey})` : 'All puroks, Barangay Tago';

  const [category, setCategory] = useState('SENIOR_CITIZEN');
  const [zoneId, setZoneId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({});

  const [barangayName, setBarangayName] = useState('Republic of the Philippines · City of Naga · Barangay Tago');
  const [healthCenterName, setHealthCenterName] = useState('Barangay Tago Health Center');
  const [coverageArea, setCoverageArea] = useState(defaultArea);
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [preparedBy, setPreparedBy] = useState(user?.full_name || '');
  const [preparedByRole, setPreparedByRole] = useState(user?.role === 'BHW' ? 'Barangay Health Worker' : user?.role === 'MIDWIFE' ? 'Midwife' : '');
  const [certifiedBy, setCertifiedBy] = useState('Maria Santos, RM');
  const [certifiedByRole, setCertifiedByRole] = useState('Rural Health Midwife');

  const fetchMasterlist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('category', category);
      if (zoneId) params.set('zone_id', zoneId);
      const res = await api(`/api/masterlists?${params.toString()}`);
      setData(res);
      setCounts((prev) => ({ ...prev, [category]: res.total ?? 0 }));
    } catch (err) {
      setError(err.message || 'The masterlist could not be generated.');
      showToast({ type: 'danger', message: 'The masterlist could not be generated.' });
    } finally { setLoading(false); }
  }, [category, zoneId]);

  useEffect(() => { fetchMasterlist(); }, [fetchMasterlist]);

  /* Totals for every programme tab, refreshed when the purok changes. */
  useEffect(() => {
    let cancelled = false;
    Promise.all(MASTERLIST_CATEGORIES.map(async (c) => {
      try {
        const params = new URLSearchParams({ category: c.key });
        if (zoneId) params.set('zone_id', zoneId);
        const res = await api(`/api/masterlists?${params.toString()}`);
        return [c.key, res.total ?? 0];
      } catch { return [c.key, undefined]; }
    })).then((entries) => { if (!cancelled) setCounts(Object.fromEntries(entries)); });
    return () => { cancelled = true; };
  }, [zoneId]);

  useEffect(() => {
    setCoverageArea(zoneId ? (ZONES.find((z) => String(z.id) === String(zoneId))?.name || '') : defaultArea);
  }, [zoneId, defaultArea]);

  const active = MASTERLIST_CATEGORIES.find((c) => c.key === category);
  const theme = CATEGORY_THEME[category];
  const extraCol = category === 'PREGNANT' || category === 'PWD';
  const cols = extraCol ? 11 : 10;

  return (
    <div className="page-stack">
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Program masterlists</h1>
          <p className="page-subtitle">Target lists built from the resident records. Choose a program, check the sheet, then print.</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => window.print()} iconLeft={<Printer className="h-4 w-4" />} disabled={loading}>Print masterlist</Button>
        </div>
      </div>

      <div className="no-print"><Alert type="danger" message={error} onClose={() => setError('')} /></div>

      <div className="program-tabs no-print" role="group" aria-label="Program">
        {MASTERLIST_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICON[cat.key];
          return (
            <button key={cat.key} type="button" className={`program-tab ${CATEGORY_THEME[cat.key]}`} aria-pressed={category === cat.key} onClick={() => setCategory(cat.key)}>
              <span className="pt-top">
                <span className="pt-count">{counts[cat.key] ?? '–'}</span>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="pt-label">{SHORT_LABEL[cat.key]}</span>
              <span className="pt-desc">{cat.desc}</span>
            </button>
          );
        })}
      </div>

      <div className="toolbar no-print">
        <label htmlFor="ml_zone" className="form-label" style={{ margin: 0 }}>Purok</label>
        <select id="ml_zone" className="form-select" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
          <option value="">{isBHW ? 'All my puroks' : 'All puroks'}</option>
          {ZONES.filter((z) => !isBHW || assignedZones.includes(z.id)).map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <span className="sheet-hint"><PenLine className="h-4 w-4" />Click any text on the letterhead or sign-off to edit it before printing.</span>
        <span className="toolbar-meta">
          <strong>{data?.total ?? 0}</strong> {data?.total === 1 ? 'resident' : 'residents'}
          {data?.generated_at ? <>, generated {new Date(data.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</> : null}
        </span>
      </div>

      <div className="sheet-desk">
        <article className={`sheet ${theme}`} aria-label={`Masterlist of ${active?.label}`}>
          <div className="sheet-tab" aria-hidden="true" />
          <header className="letterhead">
            <input className="lh-input lh-small" value={barangayName} onChange={(e) => setBarangayName(e.target.value)} aria-label="Letterhead line" />
            <input className="lh-input lh-big" value={healthCenterName} onChange={(e) => setHealthCenterName(e.target.value)} aria-label="Health center name" />
            <p className="lh-title">Masterlist of {active?.label}</p>
            <div className="lh-meta">
              <label>Coverage area <input className="lh-input" value={coverageArea} onChange={(e) => setCoverageArea(e.target.value)} /></label>
              <label>Report date <input type="date" className="lh-input" value={reportDate} onChange={(e) => setReportDate(e.target.value)} /></label>
            </div>
          </header>

          <div className="sheet-scroll">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th className="c" style={{ width: 36 }}>No.</th>
                  <th>Name (last, first, middle)</th>
                  <th>Household no.</th>
                  <th className="c">Purok</th>
                  <th>Birth date</th>
                  <th className="c">Age</th>
                  <th className="c">Sex</th>
                  {category === 'PREGNANT' && <th className="c">LMP</th>}
                  {category === 'PWD' && <th>Disability</th>}
                  <th>Conditions</th>
                  <th>PhilHealth no.</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={cols} style={{ padding: 0 }}><SkeletonList count={4} variant="row" /></td></tr>
                ) : !data?.items || data.items.length === 0 ? (
                  <tr><td colSpan={cols} className="c" style={{ padding: '1.5rem', color: '#555' }}>No residents are in this list for the selected purok.</td></tr>
                ) : (
                  data.items.map((r, i) => (
                    <tr key={r.id}>
                      <td className="c">{i + 1}</td>
                      <td className="name">{r.last_name}, {r.first_name} {r.middle_name || ''}</td>
                      <td><code>{r.household_no}</code></td>
                      <td className="c">{r.zone_name}</td>
                      <td>{r.birth_date}</td>
                      <td className="c">{r.age_years > 0 ? `${r.age_years} yrs` : `${r.age_months} mos`}</td>
                      <td className="c">{r.sex === 'M' ? 'M' : 'F'}</td>
                      {category === 'PREGNANT' && <td className="c">{r.lmp_date || '—'}</td>}
                      {category === 'PWD' && <td>{r.disability_type || r.disability_type_code || '—'}</td>}
                      <td>{r.medical_conditions?.length ? r.medical_conditions.map((c) => c.condition_code).join(', ') : 'None'}</td>
                      <td><code>{r.philhealth_id || '—'}</code></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="sheet-sign">
            <div>
              <p className="lbl">Prepared by</p>
              <input className="lh-input sig-name" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} aria-label="Prepared by name" />
              <input className="lh-input sig-role" value={preparedByRole} onChange={(e) => setPreparedByRole(e.target.value)} aria-label="Prepared by position" />
            </div>
            <div>
              <p className="lbl">Certified correct</p>
              <input className="lh-input sig-name" value={certifiedBy} onChange={(e) => setCertifiedBy(e.target.value)} aria-label="Certified by name" />
              <input className="lh-input sig-role" value={certifiedByRole} onChange={(e) => setCertifiedByRole(e.target.value)} aria-label="Certified by position" />
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
