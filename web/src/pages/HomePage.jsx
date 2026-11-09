import React, { useEffect, useMemo, useState } from 'react';
import { SkeletonNum } from '../components/Skeleton.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { Button } from '../components/Button.jsx';
import { LoginIllustration } from '../components/LoginIllustration.jsx';
import { ZONES, MASTERLIST_CATEGORIES, CATEGORY_THEME } from '../constants.js';
import { Plus, Search, ChevronRight, FileText, PenLine } from 'lucide-react';

const DRAFT_KEY = 'bhc_household_draft_v1';
const PROGRAM_LABEL = { SENIOR_CITIZEN: 'Senior citizens', UNDER_FIVE: 'Under-five children', PREGNANT: 'Pregnant women', PWD: 'Persons with disability' };

const hasDraft = () => {
  try { return Boolean(sessionStorage.getItem(DRAFT_KEY)); } catch { return false; }
};

/** Landing page for health workers and the midwife: where they cover, what is due, and the next step. */
export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isBHW = user?.role === 'BHW';
  const zones = useMemo(
    () => (isBHW ? ZONES.filter((z) => (user.zone_ids || []).includes(z.id)) : ZONES),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isBHW, (user?.zone_ids || []).join(',')],
  );

  const [query, setQuery] = useState('');
  const [zoneStats, setZoneStats] = useState({});
  const [programs, setPrograms] = useState({});
  const [loading, setLoading] = useState(true);
  const draft = isBHW && hasDraft();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const zoneCalls = zones.map(async (z) => {
      try {
        const d = await api(`/api/residents?zone_id=${z.id}&group_by=household&page=1&page_size=1`);
        return [z.id, { households: d.total ?? 0, residents: d.total_residents ?? 0 }];
      } catch { return [z.id, null]; }
    });
    const programCalls = MASTERLIST_CATEGORIES.map(async (c) => {
      try {
        const d = await api(`/api/masterlists?category=${c.key}`);
        return [c.key, d.total ?? 0];
      } catch { return [c.key, undefined]; }
    });
    Promise.all([Promise.all(zoneCalls), Promise.all(programCalls)]).then(([z, p]) => {
      if (cancelled) return;
      setZoneStats(Object.fromEntries(z));
      setPrograms(Object.fromEntries(p));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [zones]);

  const firstName = (user?.full_name || '').split(' ')[0];
  const today = new Date().toLocaleDateString('en-PH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const totals = Object.values(zoneStats).reduce(
    (acc, s) => (s ? { households: acc.households + s.households, residents: acc.residents + s.residents } : acc),
    { households: 0, residents: 0 },
  );
  const n = (v) => (loading || v === undefined || v === null ? <SkeletonNum /> : v);

  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/residents?q=${encodeURIComponent(q)}` : '/residents');
  };

  return (
    <div className="page-stack home">
      <section className="home-hello">
        <div className="home-hello-text">
          <p className="home-date">{today}</p>
          <h1>Marhay na aldaw, {firstName}.</h1>
          <p className="home-scope">
            {isBHW
              ? <>You cover <strong>{zones.map((z) => z.name).join(', ') || 'no purok yet'}</strong>: {n(totals.households)} households, {n(totals.residents)} residents.</>
              : <>Read-only view of <strong>all five puroks</strong>: {n(totals.households)} households, {n(totals.residents)} residents.</>}
          </p>

          <div className="home-actions">
            {isBHW && (
              <Button variant="primary" size="lg" iconLeft={draft ? <PenLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />} onClick={() => navigate('/households/new')}>
                {draft ? 'Continue household draft' : 'Encode a household'}
              </Button>
            )}
            {!isBHW && (
              <Button variant="primary" size="lg" iconLeft={<FileText className="h-4 w-4" />} onClick={() => navigate('/masterlists')}>
                Print a masterlist
              </Button>
            )}
            <form className="home-search" onSubmit={onSearch} role="search">
              <Search className="h-4 w-4" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a resident by name" aria-label="Find a resident by name" />
              <button type="submit" className="btn btn-secondary btn-sm">Search</button>
            </form>
          </div>
          {draft && <p className="home-draft">You have an unsaved household from this session. It is kept until you close this tab.</p>}
        </div>
        <div className="home-hello-art" aria-hidden="true"><LoginIllustration /></div>
      </section>

      <div className="home-grid">
        <section className="home-panel" aria-labelledby="home-puroks">
          <header>
            <h2 id="home-puroks">{isBHW ? 'Your puroks' : 'Puroks'}</h2>
            <Link to="/residents" className="home-more">All residents <ChevronRight className="h-4 w-4" /></Link>
          </header>
          {zones.length === 0 && <p className="home-empty">No purok is assigned to your account yet. Ask the administrator to assign one.</p>}
          <ul className="home-list">
            {zones.map((z) => {
              const s = zoneStats[z.id];
              return (
                <li key={z.id}>
                  <Link to={`/residents?zone=${z.id}`} className="home-row">
                    <span className="home-row-main">
                      <strong>{z.name}</strong>
                      <span>{z.description}</span>
                    </span>
                    <span className="home-row-figs">
                      <span><b>{n(s?.households)}</b> households</span>
                      <span><b>{n(s?.residents)}</b> residents</span>
                    </span>
                    <ChevronRight className="h-4 w-4 home-row-go" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="home-panel" aria-labelledby="home-programs">
          <header>
            <h2 id="home-programs">Program masterlists</h2>
            <Link to="/masterlists" className="home-more">Open masterlists <ChevronRight className="h-4 w-4" /></Link>
          </header>
          <ul className="home-list">
            {MASTERLIST_CATEGORIES.map((c) => (
              <li key={c.key}>
                <Link to={`/masterlists?category=${c.key}`} className={`home-row home-program ${CATEGORY_THEME[c.key]}`}>
                  <span className="home-row-main">
                    <strong>{PROGRAM_LABEL[c.key]}</strong>
                    <span>{c.desc}</span>
                  </span>
                  <span className="home-program-count">{n(programs[c.key])}</span>
                  <ChevronRight className="h-4 w-4 home-row-go" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="home-note">Counts include active residents in {isBHW ? 'your puroks' : 'all puroks'}. Open a list to check it and print.</p>
        </section>
      </div>
    </div>
  );
}
