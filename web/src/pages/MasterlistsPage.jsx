import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { Alert } from '../components/Alert.jsx';
import { Skeleton, SkeletonList } from '../components/Skeleton.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Breadcrumb } from '../components/Breadcrumb.jsx';
import { Card } from '../components/Card.jsx';
import { Button } from '../components/Button.jsx';
import { showToast } from '../components/Toast.jsx';
import { ZONES, MASTERLIST_CATEGORIES } from '../constants.js';
import { Printer, FileText, Baby, Heart, Accessibility, Users as UsersIcon } from 'lucide-react';

export function MasterlistsPage() {
  const { user } = useAuth();
  const isBHW = user?.role === 'BHW';
  const assignedZones = user?.zone_ids || [];

  const [category, setCategory] = useState('SENIOR_CITIZEN');
  const [zoneId, setZoneId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [barangayName, setBarangayName] = useState('Barangay Tago');
  const [healthCenterName, setHealthCenterName] = useState('Barangay Tago Health Center');
  const [coverageArea, setCoverageArea] = useState(isBHW ? `Assigned Puroks (${assignedZones.join(', ')})` : 'All Puroks (Barangay Tago)');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [preparedBy, setPreparedBy] = useState(user?.full_name || '');
  const [preparedByRole, setPreparedByRole] = useState(user?.role === 'BHW' ? 'Barangay Health Worker (BHW)' : (user?.role || ''));
  const [certifiedBy, setCertifiedBy] = useState('Maria Santos, RM');
  const [certifiedByRole, setCertifiedByRole] = useState('Rural Health Midwife / Clinic Supervisor');

  const fetchMasterlist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('category', category);
      if (zoneId) params.set('zone_id', zoneId);
      const res = await api(`/api/masterlists?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to generate masterlist.');
      showToast({ type: 'danger', message: 'Failed to generate masterlist.' });
    } finally { setLoading(false); }
  }, [category, zoneId]);

  useEffect(() => { fetchMasterlist(); }, [fetchMasterlist]);

  useEffect(() => {
    const area = zoneId
      ? (ZONES.find((z) => String(z.id) === String(zoneId))?.name || '')
      : (isBHW ? `Assigned Puroks (${assignedZones.join(', ')})` : 'All Puroks (Barangay Tago)');
    setCoverageArea(area);
  }, [zoneId, isBHW, assignedZones]);

  const handlePrint = () => { window.print(); };

  const activeCategoryObj = MASTERLIST_CATEGORIES.find((c) => c.key === category);

  const getCategoryIcon = (key, cls = 'h-4 w-4') => {
    switch (key) {
      case 'SENIOR_CITIZEN': return <UsersIcon className={cls} />;
      case 'UNDER_FIVE': return <Baby className={cls} />;
      case 'PREGNANT': return <Heart className={cls} />;
      case 'PWD': return <Accessibility className={cls} />;
      default: return <FileText className={cls} />;
    }
  };

  const breadcrumbItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Program Masterlists' },
  ];

  return (
    <div className="page-stack" style={{ animation: 'fadeInUp 0.3s ease backwards' }}>
      <div className="no-print"><Breadcrumb items={breadcrumbItems} /></div>

      <div className="page-header no-print">
        <div className="page-title-group">
          <h1 className="page-title">Program masterlists</h1>
          <p className="page-subtitle">
            Target-group lists generated from the resident records, ready to print on the health center letterhead.
          </p>
        </div>
        <div className="page-actions no-print">
          <Button variant="primary" onClick={handlePrint} iconLeft={<Printer className="h-4 w-4" />}>Print masterlist</Button>
        </div>
      </div>

      <div className="no-print"><Alert type="danger" message={error} onClose={() => setError('')} /></div>

      <div className="tabs-pill no-print">
        {MASTERLIST_CATEGORIES.map((cat) => (
          <button key={cat.key} type="button" className={`tab-pill-btn ${category === cat.key ? 'active' : ''}`} onClick={() => setCategory(cat.key)} aria-pressed={category === cat.key}>
            {getCategoryIcon(cat.key)}<span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="toolbar no-print" style={{ paddingBottom: '1rem' }}>
        <label htmlFor="ml_zone" style={{ fontSize: 'var(--fs-sm)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Purok</label>
        <select id="ml_zone" className="form-select" style={{ width: 'auto', minWidth: '200px' }} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
          <option value="">{isBHW ? 'All assigned puroks' : 'All puroks (barangay-wide)'}</option>
          {ZONES.map((z) => {
            const canAccess = !isBHW || assignedZones.includes(z.id);
            if (!canAccess) return null;
            return <option key={z.id} value={z.id}>{z.name}</option>;
          })}
        </select>
        <span className="toolbar-meta">
          <strong>{data?.total ?? 0}</strong> {data?.total === 1 ? 'resident' : 'residents'} in this list
          {data?.generated_at ? <> · generated {new Date(data.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</> : null}
        </span>
      </div>

      <Card style={{ padding: '0' }} className="print-card">
        <div style={{ padding: '1.5rem' }}>
          <div className="print-letterhead" style={{ textAlign: 'center', marginBottom: '1rem', borderBottom: '2px solid var(--teal-800)', paddingBottom: '0.75rem' }}>
            <input value={barangayName} onChange={(e) => setBarangayName(e.target.value)} style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: 'var(--fs-xs)', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--slate-600)', fontWeight: 700, border: 'none', background: 'transparent', outline: 'none', marginBottom: '2px' }} />
            <input value={healthCenterName} onChange={(e) => setHealthCenterName(e.target.value)} style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-heading)', border: 'none', background: 'transparent', outline: 'none', margin: '4px 0' }} />
            <input value={`OFFICIAL MASTERLIST OF ${activeCategoryObj?.label.toUpperCase()}`} onChange={() => {}} readOnly style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: '1.05rem', fontWeight: 800, color: 'var(--teal-700)', border: 'none', background: 'transparent', outline: 'none', marginTop: '4px', letterSpacing: '0.02em' }} />
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span>Coverage Area:</span>
              <input value={coverageArea} onChange={(e) => setCoverageArea(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 700, color: 'var(--text-heading)', fontSize: 'var(--fs-xs)', width: 'auto', minWidth: '120px', textAlign: 'center' }} />
              <span>· Report Date:</span>
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 700, color: 'var(--text-heading)', fontSize: 'var(--fs-xs)' }} />
            </div>
          </div>

          <div className="table-wrap" style={{ border: '1px solid var(--slate-400)', borderRadius: 0 }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '36px', border: '1px solid var(--slate-400)', background: 'var(--slate-100)', textAlign: 'center' }}>#</th>
                  <th style={{ border: '1px solid var(--slate-400)', background: 'var(--slate-100)' }}>Resident Full Name</th>
                  <th style={{ border: '1px solid var(--slate-400)', background: 'var(--slate-100)' }}>Household No.</th>
                  <th style={{ width: '90px', border: '1px solid var(--slate-400)', background: 'var(--slate-100)' }}>Purok</th>
                  <th style={{ border: '1px solid var(--slate-400)', background: 'var(--slate-100)' }}>Birth Date</th>
                  <th style={{ width: '70px', border: '1px solid var(--slate-400)', background: 'var(--slate-100)' }}>Age</th>
                  <th style={{ width: '60px', border: '1px solid var(--slate-400)', background: 'var(--slate-100)' }}>Sex</th>
                  {category === 'PREGNANT' && <th style={{ width: '90px', border: '1px solid var(--slate-400)', background: 'var(--slate-100)' }}>LMP Date</th>}
                  {category === 'PWD' && <th style={{ border: '1px solid var(--slate-400)', background: 'var(--slate-100)' }}>Disability</th>}
                  <th style={{ border: '1px solid var(--slate-400)', background: 'var(--slate-100)' }}>Medical Conditions</th>
                  <th style={{ width: '110px', border: '1px solid var(--slate-400)', background: 'var(--slate-100)' }}>PhilHealth No.</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={category === 'PREGNANT' || category === 'PWD' ? 11 : 10} style={{ padding: 0, border: 'none' }}><SkeletonList count={4} variant="row" /></td></tr>
                ) : !data?.items || data.items.length === 0 ? (
                  <tr><td colSpan={category === 'PREGNANT' || category === 'PWD' ? 11 : 10} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>No records found.</td></tr>
                ) : (
                  data.items.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ border: '1px solid var(--slate-300)', textAlign: 'center', fontSize: 'var(--fs-xs)' }}>{i + 1}</td>
                      <td style={{ border: '1px solid var(--slate-300)', fontWeight: 600 }}>{r.last_name}, {r.first_name} {r.middle_name || ''}</td>
                      <td style={{ border: '1px solid var(--slate-300)', fontSize: 'var(--fs-xs)' }}>{r.household_no}</td>
                      <td style={{ border: '1px solid var(--slate-300)', textAlign: 'center' }}>{r.zone_name}</td>
                      <td style={{ border: '1px solid var(--slate-300)' }}>{r.birth_date}</td>
                      <td style={{ border: '1px solid var(--slate-300)', textAlign: 'center' }}>{r.age_years > 0 ? `${r.age_years} yrs` : `${r.age_months} mos`}</td>
                      <td style={{ border: '1px solid var(--slate-300)', textAlign: 'center' }}>{r.sex === 'M' ? 'Male' : 'Female'}</td>
                      {category === 'PREGNANT' && <td style={{ border: '1px solid var(--slate-300)', textAlign: 'center' }}>{r.lmp_date || 'N/A'}</td>}
                      {category === 'PWD' && <td style={{ border: '1px solid var(--slate-300)' }}>{r.disability_type || r.disability_type_code || 'N/A'}</td>}
                      <td style={{ border: '1px solid var(--slate-300)', fontSize: 'var(--fs-xs)' }}>{(r.medical_conditions && r.medical_conditions.length > 0) ? r.medical_conditions.map((c) => c.condition_code).join(', ') : 'None'}</td>
                      <td style={{ border: '1px solid var(--slate-300)', fontSize: 'var(--fs-xs)' }}>{r.philhealth_id ? r.philhealth_id : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--slate-600)', marginBottom: '2rem', fontWeight: 700 }}>Prepared by:</div>
              <input value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} style={{ width: '80%', paddingBottom: '4px', fontWeight: 600, border: 'none', borderBottom: '1px solid var(--ink)', background: 'transparent', outline: 'none', fontSize: 'var(--fs-base)', color: 'var(--text-heading)' }} />
              <input value={preparedByRole} onChange={(e) => setPreparedByRole(e.target.value)} style={{ fontSize: 'var(--fs-xs)', color: 'var(--slate-600)', marginTop: '4px', border: 'none', background: 'transparent', outline: 'none', width: '80%' }} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--slate-600)', marginBottom: '2rem', fontWeight: 700 }}>Certified Correct:</div>
              <input value={certifiedBy} onChange={(e) => setCertifiedBy(e.target.value)} style={{ width: '80%', paddingBottom: '4px', fontWeight: 600, border: 'none', borderBottom: '1px solid var(--ink)', background: 'transparent', outline: 'none', fontSize: 'var(--fs-base)', color: 'var(--text-heading)' }} />
              <input value={certifiedByRole} onChange={(e) => setCertifiedByRole(e.target.value)} style={{ fontSize: 'var(--fs-xs)', color: 'var(--slate-600)', marginTop: '4px', border: 'none', background: 'transparent', outline: 'none', width: '80%' }} />
            </div>
          </div>
        </div>
      </Card>

    </div>
  );
}
