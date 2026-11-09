import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { Alert } from '../components/Alert.jsx';
import { SkeletonList, SkeletonNum } from '../components/Skeleton.jsx';
import { Button } from '../components/Button.jsx';
import { showToast } from '../components/Toast.jsx';
import { downloadCsv, slug } from '../lib/csv.js';
import {
  ZONES, MASTERLIST_CATEGORIES, CATEGORY_THEME, RELATIONS_TO_HEAD, CIVIL_STATUSES, EDUCATION_LEVELS,
  FP_METHODS, DISABILITY_TYPES, AGE_RISK_GROUPS, AGE_GROUP_SHORT, RELIGIONS, FP_STATUSES,
  WATER_SOURCES, TOILET_FACILITIES,
} from '../constants.js';
import { Printer, Download, PenLine, Users as UsersIcon, Baby, HeartPulse, Accessibility, Home } from 'lucide-react';

/* The four programme lists from the API, plus every resident grouped by household. */
const ALL = 'ALL_RESIDENTS';
const TABS = [...MASTERLIST_CATEGORIES, { key: ALL, label: 'All residents', desc: 'Everyone, grouped by household' }];
const CATEGORY_ICON = { SENIOR_CITIZEN: UsersIcon, UNDER_FIVE: Baby, PREGNANT: HeartPulse, PWD: Accessibility, [ALL]: Home };
const SHORT_LABEL = { SENIOR_CITIZEN: 'Senior citizens', UNDER_FIVE: 'Under-five children', PREGNANT: 'Pregnant women', PWD: 'Persons with disability', [ALL]: 'All residents' };
const DOC_TITLE = {
  SENIOR_CITIZEN: 'Masterlist of Senior Citizens (60 years and older)',
  UNDER_FIVE: 'Masterlist of Under-Five Children (0 to 59 months)',
  PREGNANT: 'Masterlist of Pregnant Women',
  PWD: 'Masterlist of Persons with Disability',
  [ALL]: 'Masterlist of Residents by Household',
};
const CONDITION_NAME = { HPN: 'Hypertension', DM: 'Diabetes', TB: 'Tuberculosis' };

/* "1959-03-14" -> "14 Mar 1959" */
const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
/* Expected date of delivery: last menstrual period + 280 days (Naegele's rule). */
const eddFrom = (lmp) => {
  if (!lmp) return '';
  const d = new Date(`${lmp}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + 280);
  return d.toISOString().slice(0, 10);
};
const ageText = (r) => (r.age_years > 0 ? `${r.age_years} yrs` : `${r.age_months ?? 0} mos`);
const conditionsText = (r) => (r.medical_conditions || []).map((c) => CONDITION_NAME[c.condition_code] || c.other_specify || 'Other').join(', ');
const label = (list, code) => list.find((x) => x.code === code)?.label || code || '';
const yesNo = (v) => (v ? 'Yes' : 'No');
const ETHNIC = { IP: 'Indigenous people', NON_IP: 'Non-IP' };
const PH_MEMBERSHIP = { MEMBER: 'Member', DEPENDENT: 'Dependent' };
const PH_CATEGORY = { DIRECT: 'Direct contributor', INDIRECT: 'Indirect contributor' };
const relationText = (r) => (r.relation_to_head === 'OTHER' && r.relation_other ? r.relation_other : label(RELATIONS_TO_HEAD, r.relation_to_head));
const religionText = (r) => (r.religion_code === 'OTH' && r.religion_other ? r.religion_other : label(RELIGIONS, r.religion_code));
const fpText = (r) => (r.uses_fp ? (r.fp_method_code === 'OTH' && r.fp_method_other ? r.fp_method_other : label(FP_METHODS, r.fp_method_code)) : '');
const philhealthText = (r) => [r.philhealth_id, PH_MEMBERSHIP[r.philhealth_membership], PH_CATEGORY[r.philhealth_category]].filter(Boolean).join(', ');
const toiletOf = (code) => TOILET_FACILITIES.find((t) => t.code === code);
/* Household details from GET /api/households/{id}. */
const hhFacts = (h) => (h ? [
  ['Address', h.address_line || 'Not stated'],
  ['Visited', fmtDate(h.date_of_visit)],
  ['Water', label(WATER_SOURCES, h.water_source_code) || 'Not stated'],
  ['Toilet', label(TOILET_FACILITIES, h.toilet_facility_code) || 'Not stated'],
  ['4Ps', h.is_4ps_household ? `Yes${h.fourps_household_id ? `, ${h.fourps_household_id}` : ''}` : 'No'],
  ['Reviewed by', h.reviewed_by_name || 'Pending'],
] : []);
const notesText = (r) => [r.is_pregnant && `Pregnant (LMP ${fmtDate(r.lmp_date)})`, r.is_pwd && `PWD${r.disability_type ? `: ${r.disability_type}` : ''}`, conditionsText(r), r.uses_fp && `FP: ${fpText(r)}`].filter(Boolean).join('; ');
const fullName = (r) => `${r.last_name}, ${r.first_name}${r.middle_name ? ` ${r.middle_name}` : ''}`;

const SORTS = {
  name: { label: 'Name (A to Z)', fn: (a, b) => fullName(a).localeCompare(fullName(b)) },
  purok: { label: 'Purok, then name', fn: (a, b) => (a.zone_name || '').localeCompare(b.zone_name || '', undefined, { numeric: true }) || fullName(a).localeCompare(fullName(b)) },
  age: { label: 'Age (oldest first)', fn: (a, b) => (b.age_years * 12 + (b.age_months || 0)) - (a.age_years * 12 + (a.age_months || 0)) },
};

export function MasterlistsPage() {
  const { user } = useAuth();
  const isBHW = user?.role === 'BHW';
  const assignedZones = user?.zone_ids || [];
  const assignedKey = assignedZones.join(',');
  const defaultArea = isBHW
    ? `Purok ${assignedZones.join(', ')}, Barangay Tago`
    : 'All puroks, Barangay Tago';

  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState(() => {
    const c = searchParams.get('category');
    return TABS.some((x) => x.key === c) ? c : 'SENIOR_CITIZEN';
  });
  const [zoneId, setZoneId] = useState('');
  const [sortBy, setSortBy] = useState('purok');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({});

  /* Editable letterhead and sign-off (kept on screen only, never saved). */
  const [lhCountry, setLhCountry] = useState('Republic of the Philippines');
  const [lhCity, setLhCity] = useState('City of Naga');
  const [lhBarangay, setLhBarangay] = useState('Barangay Tago');
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
      if (category === ALL) {
        /* Every resident in scope, a page of 100 households at a time, head first. */
        const items = [];
        for (let page = 1; page <= 500; page += 1) {
          const params = new URLSearchParams({ group_by: 'household', page: String(page), page_size: '100' });
          if (zoneId) params.set('zone_id', zoneId);
          const res = await api(`/api/residents?${params.toString()}`);
          items.push(...(res.items || []));
          if (!res.items?.length || page * 100 >= (res.total ?? 0)) break;
        }
        /* Household details (address, water, toilet, 4Ps) come from the household
           record, a few at a time so the API is not flooded. */
        const ids = [...new Set(items.map((r) => r.household_id))];
        const details = {};
        for (let i = 0; i < ids.length; i += 6) {
          const batch = await Promise.all(ids.slice(i, i + 6).map((id) => api(`/api/households/${id}`).catch(() => null)));
          batch.forEach((h, j) => { details[ids[i + j]] = h; });
        }
        setData({ category: ALL, items, households: details, total: items.length, generated_at: new Date().toISOString() });
        setCounts((prev) => ({ ...prev, [ALL]: items.length }));
      } else {
        const params = new URLSearchParams();
        params.set('category', category);
        if (zoneId) params.set('zone_id', zoneId);
        const res = await api(`/api/masterlists?${params.toString()}`);
        setData(res);
        setCounts((prev) => ({ ...prev, [category]: res.total ?? 0 }));
      }
    } catch (err) {
      setData(null);
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
    }).concat((async () => {
      try {
        const params = new URLSearchParams({ page: '1', page_size: '1' });
        if (zoneId) params.set('zone_id', zoneId);
        const res = await api(`/api/residents?${params.toString()}`);
        return [ALL, res.total_residents ?? res.total ?? 0];
      } catch { return [ALL, undefined]; }
    })())).then((entries) => { if (!cancelled) setCounts(Object.fromEntries(entries)); });
    return () => { cancelled = true; };
  }, [zoneId]);

  useEffect(() => {
    setCoverageArea(zoneId ? `${ZONES.find((z) => String(z.id) === String(zoneId))?.name || ''}, Barangay Tago` : defaultArea);
  }, [zoneId, defaultArea]);

  const isAll = category === ALL;
  /* All residents keep the household order from the API; programme lists use the chosen order. */
  const rows = useMemo(
    () => (data?.category === ALL ? [...(data?.items || [])] : [...(data?.items || [])].sort(SORTS[sortBy].fn)),
    [data, sortBy],
  );
  const households = useMemo(() => {
    const out = [];
    for (const r of rows) {
      let hh = out[out.length - 1];
      if (!hh || hh.id !== r.household_id) { hh = { id: r.household_id, no: r.household_no, zone: r.zone_name, detail: data?.households?.[r.household_id], members: [] }; out.push(hh); }
      hh.members.push(r);
    }
    return out;
  }, [rows, data]);
  const female = rows.filter((r) => r.sex === 'F').length;
  const male = rows.length - female;
  const generatedAt = data?.generated_at ? new Date(data.generated_at) : new Date();
  const generatedText = generatedAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

  const theme = CATEGORY_THEME[category] || '';
  const isPregnant = category === 'PREGNANT';
  const isPwd = category === 'PWD';
  const cols = isAll ? 12 : 10 + (isPregnant ? 2 : 0) + (isPwd ? 1 : 0);

  /* Same content as the printed sheet, for opening in a spreadsheet. */
  const handleDownload = () => {
    const zonePart = zoneId ? `purok-${zoneId}` : (isBHW ? 'my-puroks' : 'all-puroks');
    if (isAll) {
      const head = ['Household no.', 'Purok', 'Date of visit', 'Address', 'Barangay', 'City/Municipality', 'Water source', 'Toilet facility',
        'Sanitary toilet', '4Ps household', '4Ps ID', 'Reviewed by',
        'Last name', 'First name', 'Middle name', 'Relation to head', 'Sex', 'Birth date', 'Age (years)', 'Age (months)', 'Target group',
        'Civil status', 'Education', 'Religion', 'Ethnic group', 'Occupation', 'PhilHealth no.', 'PhilHealth membership', 'PhilHealth category',
        'Pregnant', 'LMP', 'EDD (estimated)', 'Family planning', 'FP method', 'FP status', 'Person with disability', 'Disability', 'Conditions'];
      const body = rows.map((r) => {
        const h = data?.households?.[r.household_id] || {};
        return [
          r.household_no, r.zone_name, h.date_of_visit, h.address_line, h.barangay, h.municipality_city,
          label(WATER_SOURCES, h.water_source_code), label(TOILET_FACILITIES, h.toilet_facility_code),
          h.toilet_facility_code ? yesNo(toiletOf(h.toilet_facility_code)?.sanitary) : '', yesNo(h.is_4ps_household), h.fourps_household_id, h.reviewed_by_name,
          r.last_name, r.first_name, r.middle_name, relationText(r), r.sex === 'M' ? 'Male' : 'Female', r.birth_date, r.age_years, r.age_months,
          AGE_RISK_GROUPS[r.age_risk_group] || r.age_risk_group, label(CIVIL_STATUSES, r.civil_status_code), label(EDUCATION_LEVELS, r.education_code),
          religionText(r), ETHNIC[r.ethnic_group] || '', r.occupation, r.philhealth_id, PH_MEMBERSHIP[r.philhealth_membership] || '', PH_CATEGORY[r.philhealth_category] || '',
          yesNo(r.is_pregnant), r.is_pregnant ? r.lmp_date : '', r.is_pregnant ? eddFrom(r.lmp_date) : '',
          r.uses_fp === null || r.uses_fp === undefined ? '' : yesNo(r.uses_fp), fpText(r), r.uses_fp ? label(FP_STATUSES, r.fp_status_code) : '',
          yesNo(r.is_pwd), r.is_pwd ? (r.disability_type || label(DISABILITY_TYPES, r.disability_type_code)) : '',
          conditionsText(r).replace(/, /g, '; '),
        ];
      });
      downloadCsv(`residents-${zonePart}-${reportDate}.csv`, [head, ...body]);
      return;
    }
    const head = ['No.', 'Name', 'Sex', 'Birth date', 'Age', 'Household no.', 'Purok',
      ...(isPregnant ? ['LMP', 'EDD (estimated)'] : []), ...(isPwd ? ['Disability'] : []), 'Conditions', 'PhilHealth no.'];
    const body = rows.map((r, i) => [i + 1, fullName(r), r.sex, r.birth_date, ageText(r), r.household_no, r.zone_name,
      ...(isPregnant ? [r.lmp_date || '', eddFrom(r.lmp_date)] : []), ...(isPwd ? [r.disability_type || r.disability_type_code || ''] : []),
      conditionsText(r), r.philhealth_id || '']);
    downloadCsv(`masterlist-${slug(SHORT_LABEL[category])}-${zonePart}-${reportDate}.csv`, [head, ...body]);
  };

  return (
    <div className="page-stack">
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Masterlists</h1>
          <p className="page-subtitle">Pick a program, or all residents, and a purok. Check the sheet, then print or download it.</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={handleDownload} iconLeft={<Download className="h-4 w-4" />} disabled={loading || rows.length === 0}>Download CSV</Button>
          <Button variant="primary" onClick={() => window.print()} iconLeft={<Printer className="h-4 w-4" />} disabled={loading}>{isAll ? 'Print all residents' : 'Print masterlist'}</Button>
        </div>
      </div>

      <div className="no-print"><Alert type="danger" message={error} onClose={() => setError('')} /></div>

      <div className="ml-cards no-print" role="group" aria-label="Which list">
        {TABS.map((cat) => {
          const Icon = CATEGORY_ICON[cat.key];
          return (
            <button key={cat.key} type="button" className={`ml-card ${CATEGORY_THEME[cat.key] || 't-all'}`} aria-pressed={category === cat.key} onClick={() => setCategory(cat.key)}>
              <Icon className="ml-card-icon" aria-hidden="true" />
              <span>{SHORT_LABEL[cat.key]}</span>
              <strong>{counts[cat.key] ?? <SkeletonNum />}</strong>
            </button>
          );
        })}
      </div>

      <div className="ml-toolbar no-print">
        <label className="ml-field">
          <span>Purok</span>
          <select className="form-select" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="">{isBHW ? 'All my puroks' : 'All puroks'}</option>
            {ZONES.filter((z) => !isBHW || assignedZones.includes(z.id)).map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </label>
        {!isAll && <label className="ml-field">
          <span>Order by</span>
          <select className="form-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </label>}
        <span className="toolbar-meta">
          {isAll && <><strong>{households.length}</strong> {households.length === 1 ? 'household' : 'households'}, </>}
          <strong>{rows.length}</strong> {rows.length === 1 ? 'resident' : 'residents'} listed
        </span>
      </div>
      <p className="sheet-hint no-print"><PenLine className="h-4 w-4" aria-hidden="true" />The letterhead, coverage, date and signatories can be edited on the sheet before printing. Edits are not saved.</p>

      <div className="sheet-desk">
        <article className={`sheet ${theme}`} aria-label={DOC_TITLE[category]}>
          <header className="letterhead">
            <input className="lh-input lh-line" value={lhCountry} onChange={(e) => setLhCountry(e.target.value)} aria-label="Letterhead, first line" />
            <input className="lh-input lh-line" value={lhCity} onChange={(e) => setLhCity(e.target.value)} aria-label="Letterhead, city" />
            <input className="lh-input lh-line" value={lhBarangay} onChange={(e) => setLhBarangay(e.target.value)} aria-label="Letterhead, barangay" />
            <input className="lh-input lh-big" value={healthCenterName} onChange={(e) => setHealthCenterName(e.target.value)} aria-label="Health center name" />
          </header>

          <h2 className="doc-title">{DOC_TITLE[category]}</h2>

          <dl className="doc-meta">
            <div><dt>Coverage area</dt><dd><input className="lh-input" value={coverageArea} onChange={(e) => setCoverageArea(e.target.value)} aria-label="Coverage area" /></dd></div>
            <div>
              <dt>As of</dt>
              <dd>
                <input type="date" className="lh-input no-print" value={reportDate} onChange={(e) => setReportDate(e.target.value)} aria-label="Report date" />
                <span className="print-only">{fmtDate(reportDate)}</span>
              </dd>
            </div>
            <div><dt>{isAll ? 'Residents' : 'Total listed'}</dt><dd>{loading ? <SkeletonNum /> : `${rows.length} (${female} female, ${male} male)`}</dd></div>
            {isAll
              ? <div><dt>Households</dt><dd>{loading ? <SkeletonNum /> : households.length}</dd></div>
              : <div><dt>Arranged by</dt><dd>{SORTS[sortBy].label}</dd></div>}
          </dl>

          <div className="sheet-scroll">
{isAll ? (
            <table className="sheet-table">
              <thead>
                <tr>
                  <th className="c n">No.</th>
                  <th>Name<span className="th-sub">Last, first, middle</span></th>
                  <th>Relation</th>
                  <th className="c">Sex</th>
                  <th>Birth date</th>
                  <th className="c">Age</th>
                  <th>Target group</th>
                  <th>Civil status<span className="th-sub">Religion</span></th>
                  <th>Education<span className="th-sub">Occupation</span></th>
                  <th>PhilHealth</th>
                  <th>Health notes</th>
                  <th className="remarks">Remarks</th>
                </tr>
              </thead>
              {loading ? (
                <tbody><tr><td colSpan={cols} style={{ padding: 0 }}><SkeletonList count={4} variant="row" /></td></tr></tbody>
              ) : rows.length === 0 ? (
                <tbody><tr><td colSpan={cols} className="c empty">No residents are recorded for the selected purok.</td></tr></tbody>
              ) : (() => {
                let n = 0;
                return households.map((hh) => {
                  const head = hh.members.find((m) => m.relation_to_head === 'HEAD') || hh.members[0];
                  return (
                    <tbody key={hh.id} className="hh-group">
                      <tr className="hh-row">
                        <td colSpan={cols}>
                          <strong>{head.last_name} household</strong>
                          <span>{hh.no}</span>
                          <span>{hh.zone}</span>
                          <span>{hh.members.length} {hh.members.length === 1 ? 'member' : 'members'}</span>
                          {hh.detail && (
                            <span className="hh-facts">
                              {hhFacts(hh.detail).map(([k, v]) => <span key={k}><b>{k}:</b> {v}</span>)}
                            </span>
                          )}
                        </td>
                      </tr>
                      {hh.members.map((r) => {
                        n += 1;
                        return (
                          <tr key={r.id}>
                            <td className="c n">{n}</td>
                            <td className="name">{fullName(r)}</td>
                            <td>{relationText(r)}</td>
                            <td className="c">{r.sex}</td>
                            <td className="nowrap">{fmtDate(r.birth_date)}</td>
                            <td className="c nowrap">{ageText(r)}</td>
                            <td>{AGE_GROUP_SHORT[r.age_risk_group] || r.age_risk_group}</td>
                            <td>{label(CIVIL_STATUSES, r.civil_status_code)}<span className="td-sub">{religionText(r)}</span></td>
                            <td>{label(EDUCATION_LEVELS, r.education_code)}<span className="td-sub">{r.occupation || ''}</span></td>
                            <td>{philhealthText(r) || '—'}</td>
                            <td>{notesText(r) || '—'}</td>
                            <td className="remarks" />
                          </tr>
                        );
                      })}
                    </tbody>
                  );
                });
              })()}
            </table>
            ) : (
            <table className="sheet-table">
              <thead>
                <tr>
                  <th className="c n">No.</th>
                  <th>Name<span className="th-sub">Last, first, middle</span></th>
                  <th className="c">Sex</th>
                  <th>Birth date</th>
                  <th className="c">Age</th>
                  <th>Household no.</th>
                  <th>Purok</th>
                  {isPregnant && <th>LMP</th>}
                  {isPregnant && <th>EDD<span className="th-sub">Estimated</span></th>}
                  {isPwd && <th>Disability</th>}
                  <th>Conditions</th>
                  <th>PhilHealth no.</th>
                  <th className="remarks">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={cols} style={{ padding: 0 }}><SkeletonList count={4} variant="row" /></td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={cols} className="c empty">No residents are on this list for the selected purok.</td></tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={r.id}>
                      <td className="c n">{i + 1}</td>
                      <td className="name">{fullName(r)}</td>
                      <td className="c">{r.sex}</td>
                      <td className="nowrap">{fmtDate(r.birth_date)}</td>
                      <td className="c nowrap">{ageText(r)}</td>
                      <td className="nowrap">{r.household_no}</td>
                      <td className="nowrap">{r.zone_name}</td>
                      {isPregnant && <td className="nowrap">{fmtDate(r.lmp_date) || '—'}</td>}
                      {isPregnant && <td className="nowrap">{fmtDate(eddFrom(r.lmp_date)) || '—'}</td>}
                      {isPwd && <td>{r.disability_type || r.disability_type_code || '—'}</td>}
                      <td>{conditionsText(r) || '—'}</td>
                      <td className="nowrap">{r.philhealth_id || '—'}</td>
                      <td className="remarks" />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            )}
          </div>

          {!loading && rows.length > 0 && (
            <p className="doc-total">
              Total: {isAll && <><strong>{households.length}</strong> {households.length === 1 ? 'household' : 'households'}, </>}
              <strong>{rows.length}</strong> {rows.length === 1 ? 'resident' : 'residents'}. Nothing follows.
            </p>
          )}

          <footer className="sheet-sign">
            <div>
              <p className="lbl">Prepared by:</p>
              <input className="lh-input sig-name" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} aria-label="Prepared by name" />
              <input className="lh-input sig-role" value={preparedByRole} onChange={(e) => setPreparedByRole(e.target.value)} aria-label="Prepared by position" />
              <p className="sig-date">Date: ____________________</p>
            </div>
            <div>
              <p className="lbl">Certified correct:</p>
              <input className="lh-input sig-name" value={certifiedBy} onChange={(e) => setCertifiedBy(e.target.value)} aria-label="Certified by name" />
              <input className="lh-input sig-role" value={certifiedByRole} onChange={(e) => setCertifiedByRole(e.target.value)} aria-label="Certified by position" />
              <p className="sig-date">Date: ____________________</p>
            </div>
          </footer>

          <p className="doc-source">
            Generated from the Resident Profiling and Masterlist System on {generatedText} by {user?.full_name}.
            Contains personal health information. Keep in the health center and dispose of properly.
          </p>
        </article>
      </div>
    </div>
  );
}
