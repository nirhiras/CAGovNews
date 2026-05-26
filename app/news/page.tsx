// @ts-nocheck
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ── Constants ─────────────────────────────────────────────────

const AGENCY_COLORS = {
  'Governor': '#003366', 'CDPH': '#117a65', 'DOJ / AG': '#1a5276',
  'Caltrans': '#1f618d', 'OTS': '#7d6608', 'CDT': '#1a5276',
  'DGS': '#2874a6', 'DOF': '#1a5276', 'Insurance': '#6e2f1e',
  'Dept. Insurance': '#6e2f1e', 'DMHC': '#1a5276', 'CalHFA': '#1a5276',
  'Water Board': '#1a5276', 'CalRecycle': '#1a5276', 'CARB': '#1a5276',
  'EDD': '#1a5276', 'CDE': '#1a5276', 'DHCS': '#1a5276',
  'Controller': '#1a5276', 'Treasurer': '#1a5276', 'Sec. of State': '#1a5276',
  'CalPERS': '#1a5276', 'FTB': '#1a5276', 'CEC': '#0e6655',
  'HCD': '#1a5276', 'Cal OES': '#922b21', 'OTSI': '#005f73',
  'CPUC': '#1a6b5a', 'DFPI': '#2c3e6b', 'CalPrivacy': '#4a235a',
  'FPPC': '#6e2c00', 'DTSC': '#7d3c3c', 'CSAC': '#1a5276',
  'CDFA': '#1e6b2a', 'DPR': '#5d6d1e', 'DMV': '#21618c',
  'ABC': '#7b241c', 'CDA': '#1a6b5a', 'CRD': '#6c3483',
  'CalHR': '#2e4057', 'DCC': '#145a32', 'OEHHA': '#4d6a1b',
  'Energy Safety': '#935116', 'Parks': '#1d6533', 'CalVet': '#922b21',
  'First 5 CA': '#8e44ad', 'DDS': '#1a5276', 'DGSP': '#2874a6',
  'FI$Cal': '#1a5276',
}

const TAG_STYLES = {
  'Wildfire':            { bg: '#fef3c7', color: '#92400e' },
  'Climate':             { bg: '#d1fae5', color: '#065f46' },
  'Health':              { bg: '#ede9fe', color: '#4c1d95' },
  'Enforcement':         { bg: '#fee2e2', color: '#7f1d1d' },
  'Housing':             { bg: '#dbeafe', color: '#1e3a8a' },
  'Elections':           { bg: '#fce7f3', color: '#831843' },
  'Technology':          { bg: '#e0f2fe', color: '#075985' },
  'Agriculture':         { bg: '#f0fdf4', color: '#14532d' },
  'Procurement':         { bg: '#dbeafe', color: '#1e3a8a' },
  'Budget':              { bg: '#fef9c3', color: '#713f12' },
  'Public Safety':       { bg: '#fee2e2', color: '#7f1d1d' },
  'Environment':         { bg: '#d1fae5', color: '#065f46' },
  'Water':               { bg: '#e0f2fe', color: '#075985' },
  'Privacy':             { bg: '#ede9fe', color: '#4c1d95' },
  'Insurance':           { bg: '#fce7f3', color: '#831843' },
  'Veterans':            { bg: '#f0fdf4', color: '#14532d' },
  'Appointments':        { bg: '#f1f5f9', color: '#334155' },
  'Energy':              { bg: '#fef3c7', color: '#78350f' },
  'Disaster Relief':     { bg: '#fee2e2', color: '#7f1d1d' },
  'Consumer Protection': { bg: '#d1fae5', color: '#065f46' },
  'Grants':              { bg: '#fef3c7', color: '#92400e' },
  'Civil Rights':        { bg: '#ede9fe', color: '#4c1d95' },
  'Education':           { bg: '#dbeafe', color: '#1e3a8a' },
  'Legislation':         { bg: '#f1f5f9', color: '#334155' },
}

const DATE_PRESETS = [
  { label: 'Today',        value: 'today' },
  { label: 'Yesterday',    value: 'yesterday' },
  { label: 'Last 7 days',  value: 'last7' },
  { label: 'Last 15 days', value: 'last15' },
  { label: 'Last 30 days', value: 'last30' },
  { label: 'Last 60 days', value: 'last60' },
  { label: 'Last 180 days',value: 'last180' },
  { label: 'This week',    value: 'thisWeek' },
  { label: 'Last week',    value: 'lastWeek' },
  { label: 'This month',   value: 'thisMonth' },
  { label: 'Last month',   value: 'lastMonth' },
  { label: 'This quarter', value: 'thisQuarter' },
  { label: 'Last quarter', value: 'lastQuarter' },
  { label: 'This year',    value: 'thisYear' },
  { label: 'Last year',    value: 'lastYear' },
  { label: 'Custom range', value: 'custom' },
]

const SORT_OPTIONS = [
  { label: 'Newest first',   value: 'date_desc' },
  { label: 'Oldest first',   value: 'date_asc' },
  { label: 'A → Z',          value: 'title_asc' },
  { label: 'Z → A',          value: 'title_desc' },
  { label: 'Department A→Z', value: 'agency_asc' },
]

// ── Date helpers ──────────────────────────────────────────────

function getDateRange(preset) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const fmt = (d) => d.toISOString().split('T')[0]
  const sub = (d, n) => { const x = new Date(d); x.setDate(x.getDate() - n); return x }

  const dow = now.getDay() // 0=Sun
  const startOfWeek = sub(now, dow === 0 ? 6 : dow - 1)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const q = Math.floor(now.getMonth() / 3)
  const startOfQuarter = new Date(now.getFullYear(), q * 3, 1)

  switch (preset) {
    case 'today':        return { from: today, to: today }
    case 'yesterday':    return { from: fmt(sub(now, 1)), to: fmt(sub(now, 1)) }
    case 'last7':        return { from: fmt(sub(now, 6)), to: today }
    case 'last15':       return { from: fmt(sub(now, 14)), to: today }
    case 'last30':       return { from: fmt(sub(now, 29)), to: today }
    case 'last60':       return { from: fmt(sub(now, 59)), to: today }
    case 'last180':      return { from: fmt(sub(now, 179)), to: today }
    case 'thisWeek':     return { from: fmt(startOfWeek), to: today }
    case 'lastWeek': {
      const end = sub(startOfWeek, 1)
      return { from: fmt(sub(end, 6)), to: fmt(end) }
    }
    case 'thisMonth':    return { from: fmt(startOfMonth), to: today }
    case 'lastMonth': {
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      const start = new Date(end.getFullYear(), end.getMonth(), 1)
      return { from: fmt(start), to: fmt(end) }
    }
    case 'thisQuarter':  return { from: fmt(startOfQuarter), to: today }
    case 'lastQuarter': {
      const end = new Date(startOfQuarter.getTime() - 1)
      const start = new Date(end.getFullYear(), Math.floor(end.getMonth() / 3) * 3, 1)
      return { from: fmt(start), to: fmt(end) }
    }
    case 'thisYear':     return { from: fmt(startOfYear), to: today }
    case 'lastYear': {
      return { from: `${now.getFullYear() - 1}-01-01`, to: `${now.getFullYear() - 1}-12-31` }
    }
    default: return { from: '', to: '' }
  }
}

// ── Helpers ───────────────────────────────────────────────────

function getTagStyle(tag) {
  return TAG_STYLES[tag] || { bg: '#f1f5f9', color: '#334155' }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Sub-components ────────────────────────────────────────────

function AgencyBadge({ slug }) {
  const color = AGENCY_COLORS[slug] ?? '#1a5276'
  return (
    <span style={{
      background: color, color: '#fff', fontSize: '11px',
      fontWeight: 600, padding: '3px 8px', borderRadius: '4px',
      whiteSpace: 'nowrap', letterSpacing: '0.02em',
    }}>{slug}</span>
  )
}

function TagBadge({ tag }) {
  const { bg, color } = getTagStyle(tag)
  return (
    <span style={{
      background: bg, color, fontSize: '11px',
      padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap',
    }}>{tag}</span>
  )
}

function NewsCard({ release, onClick }) {
  const agencyColor = AGENCY_COLORS[release.agency_slug] ?? '#1a5276'
  return (
    <div
      onClick={() => onClick(release)}
      style={{
        background: '#fff', border: '0.5px solid #d1d9e6',
        borderLeft: `3px solid ${agencyColor}`,
        borderRadius: '0 6px 6px 0', padding: '14px 16px',
        cursor: 'pointer', transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px', flexWrap: 'wrap' }}>
        <AgencyBadge slug={release.agency_slug} />
        {release.tag && <TagBadge tag={release.tag} />}
        <span style={{ color: '#9aa5b4', fontSize: '11px', marginLeft: 'auto' }}>
          {formatDate(release.published_date)}
        </span>
      </div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1b3a6b', lineHeight: 1.4, marginBottom: '5px' }}>
        {release.title}
      </div>
      {release.summary && (
        <div style={{ fontSize: '12px', color: '#4a5568', lineHeight: 1.6 }}>
          {release.summary.length > 180 ? release.summary.slice(0, 180) + '…' : release.summary}
        </div>
      )}
      <div style={{ marginTop: '8px', fontSize: '11px', color: '#1b3a6b', fontWeight: 500 }}>
        Read on {release.source_url.replace(/https?:\/\//, '').split('/')[0]} →
      </div>
    </div>
  )
}

function ArticleModal({ release, onClose }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('release_content')
        .select('extracted_text, scrape_status')
        .eq('release_id', release.id)
        .single()
      setContent(data)
      setLoading(false)
    }
    load()
  }, [release.id])

  const agencyColor = AGENCY_COLORS[release.agency_slug] ?? '#1b3a6b'
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: '10px', maxWidth: '740px', width: '100%', padding: '32px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <AgencyBadge slug={release.agency_slug} />
          {release.tag && <TagBadge tag={release.tag} />}
        </div>
        <div style={{ fontSize: '11px', color: '#9aa5b4', marginBottom: '12px' }}>{formatDate(release.published_date)}</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1b3a6b', lineHeight: 1.3, marginBottom: '14px' }}>{release.title}</h1>
        {release.summary && (
          <p style={{ fontSize: '15px', color: '#374151', lineHeight: 1.7, marginBottom: '20px', borderLeft: `3px solid ${agencyColor}`, paddingLeft: '14px' }}>{release.summary}</p>
        )}
        <hr style={{ border: 'none', borderTop: '0.5px solid #e5e7eb', margin: '20px 0' }} />
        {loading ? (
          <div style={{ color: '#9aa5b4', fontSize: '13px' }}>Loading full article...</div>
        ) : content?.extracted_text && content.scrape_status === 'ok' ? (
          <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {content.extracted_text.slice(0, 4000)}{content.extracted_text.length > 4000 && '…'}
          </div>
        ) : (
          <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '6px', padding: '12px 16px', fontSize: '13px', color: '#92400e' }}>
            Full article content will be available after the next crawler run.
          </div>
        )}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '0.5px solid #e5e7eb' }}>
          <a href={release.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1b3a6b', color: '#fff', padding: '10px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
            View original on {release.source_url.replace(/https?:\/\//, '').split('/')[0]} ↗
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Saved Searches ────────────────────────────────────────────

const STORAGE_KEY = 'cagovnews_saved_searches'

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveSaved(searches) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches))
}

// ── Main Component ────────────────────────────────────────────

export default function CAGovNewsHomepage() {
  // Data
  const [releases, setReleases] = useState([])
  const [agencies, setAgencies] = useState([])
  const [tags, setTags] = useState([])
  const [counties, setCounties] = useState([])
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedRelease, setSelectedRelease] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [agencyFilter, setAgencyFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [countyFilter, setCountyFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [datePreset, setDatePreset] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('date_desc')

  // Filter panel
  const [filterOpen, setFilterOpen] = useState(false)
  const [dateDropOpen, setDateDropOpen] = useState(false)
  const dateDropRef = useRef(null)

  // Saved searches
  const [savedSearches, setSavedSearches] = useState([])
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  // Load reference data
  useEffect(() => {
    setSavedSearches(loadSaved())

    supabase.from('agencies').select('slug, name').eq('active', true).order('slug')
      .then(({ data }) => setAgencies(data ?? []))

    supabase.from('releases').select('tag').not('tag', 'is', null)
      .then(({ data }) => {
        const unique = [...new Set((data ?? []).map(r => r.tag))].sort()
        setTags(unique)
      })

    supabase.from('releases').select('id', { count: 'exact', head: true })
      .then(({ count }) => setTotalCount(count ?? 0))

    // Load counties + cities from news_sources
    supabase.from('news_sources').select('county_name, city_name, state_code').not('county_name', 'is', null)
      .then(({ data }) => {
        if (data) {
          const uniqueCounties = [...new Set(data.map(r => r.county_name).filter(Boolean))].sort()
          setCounties(uniqueCounties)
          const uniqueCities = [...new Set(data.map(r => r.city_name).filter(Boolean))].sort()
          setCities(uniqueCities)
        }
      })
  }, [])

  // Close date dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dateDropRef.current && !dateDropRef.current.contains(e.target)) setDateDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Fetch releases
  const fetchReleases = useCallback(async () => {
    setLoading(true)

    let q = supabase.from('releases').select('*').limit(200)

    // Sort
    switch (sortBy) {
      case 'date_asc':    q = q.order('published_date', { ascending: true }); break
      case 'title_asc':   q = q.order('title', { ascending: true }); break
      case 'title_desc':  q = q.order('title', { ascending: false }); break
      case 'agency_asc':  q = q.order('agency_slug', { ascending: true }); break
      default:            q = q.order('published_date', { ascending: false })
    }

    // Filters
    if (agencyFilter) q = q.eq('agency_slug', agencyFilter)
    if (tagFilter)    q = q.eq('tag', tagFilter)
    if (search)       q = q.or(`title.ilike.%${search}%,summary.ilike.%${search}%`)

    // Date range
    let from = dateFrom, to = dateTo
    if (datePreset && datePreset !== 'custom') {
      const range = getDateRange(datePreset)
      from = range.from; to = range.to
    }
    if (from) q = q.gte('published_date', from)
    if (to)   q = q.lte('published_date', to)

    const { data } = await q
    setReleases(data ?? [])
    setLoading(false)
  }, [search, agencyFilter, stateFilter, countyFilter, cityFilter, tagFilter, datePreset, dateFrom, dateTo, sortBy])

  useEffect(() => { fetchReleases() }, [fetchReleases])

  // Active filter count
  const activeFilters = [search, agencyFilter, stateFilter, countyFilter, cityFilter, tagFilter, datePreset || dateFrom].filter(Boolean).length

  const clearFilters = () => {
    setSearch(''); setAgencyFilter(''); setStateFilter(''); setCountyFilter('')
    setCityFilter(''); setTagFilter(''); setDatePreset(''); setDateFrom(''); setDateTo('')
    setSortBy('date_desc')
  }

  // Date preset label
  const dateLabel = datePreset
    ? DATE_PRESETS.find(p => p.value === datePreset)?.label
    : (dateFrom || dateTo) ? `${dateFrom} → ${dateTo}` : 'Date range'

  // Saved searches
  const currentFilters = { search, agencyFilter, stateFilter, countyFilter, cityFilter, tagFilter, datePreset, dateFrom, dateTo, sortBy }

  const saveSearch = () => {
    if (!saveName.trim()) return
    const entry = { id: Date.now(), name: saveName.trim(), filters: currentFilters, created: new Date().toISOString() }
    const updated = [entry, ...savedSearches]
    setSavedSearches(updated)
    saveSaved(updated)
    setSaveName('')
    setSaveModalOpen(false)
    setSavedMsg(`"${entry.name}" saved`)
    setTimeout(() => setSavedMsg(''), 2500)
  }

  const loadSearch = (entry) => {
    const f = entry.filters
    setSearch(f.search || '')
    setAgencyFilter(f.agencyFilter || '')
    setStateFilter(f.stateFilter || '')
    setCountyFilter(f.countyFilter || '')
    setCityFilter(f.cityFilter || '')
    setTagFilter(f.tagFilter || '')
    setDatePreset(f.datePreset || '')
    setDateFrom(f.dateFrom || '')
    setDateTo(f.dateTo || '')
    setSortBy(f.sortBy || 'date_desc')
    setFilterOpen(false)
  }

  const deleteSearch = (id) => {
    const updated = savedSearches.filter(s => s.id !== id)
    setSavedSearches(updated)
    saveSaved(updated)
  }

  const citiesForCounty = countyFilter ? cities : cities

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#1b3a6b', borderBottom: '3px solid #f5a623' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '54px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: '#fff', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#1b3a6b' }}>CA</div>
            <div>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>CA Gov News</div>
              <div style={{ color: '#93c5fd', fontSize: '9px' }}>News from Government Sources</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['Home', 'Press Releases', 'Agencies', 'Topics'].map(l => (
              <span key={l} style={{ color: '#cbd5e1', fontSize: '12px', cursor: 'pointer' }}>{l}</span>
            ))}
          </div>
          <button style={{ background: '#f5a623', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: '#1b3a6b', cursor: 'pointer' }}>Subscribe</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #d1d9e6', padding: '10px 20px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* Top row: search + controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9aa5b4', fontSize: 14 }}>🔍</span>
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search titles and summaries..."
                style={{ width: '100%', fontSize: '13px', padding: '7px 12px 7px 30px', border: '1px solid #b0c0d8', borderRadius: '6px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setFilterOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: filterOpen || activeFilters > 0 ? '#1b3a6b' : '#fff',
                color: filterOpen || activeFilters > 0 ? '#fff' : '#374151',
                border: '1px solid #b0c0d8', borderRadius: '6px',
                padding: '7px 14px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              }}
            >
              ⚙ Filters
              {activeFilters > 0 && (
                <span style={{ background: '#f5a623', color: '#1b3a6b', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>{activeFilters}</span>
              )}
            </button>

            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ fontSize: '12px', padding: '7px 10px', border: '1px solid #b0c0d8', borderRadius: '6px', color: '#374151', background: '#fff' }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Save search */}
            <button
              onClick={() => setSaveModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '1px solid #b0c0d8', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', color: '#374151', cursor: 'pointer' }}
            >
              🔖 Save
            </button>

            {/* Saved searches dropdown */}
            {savedSearches.length > 0 && (
              <div style={{ position: 'relative' }}>
                <select
                  onChange={e => { const s = savedSearches.find(x => String(x.id) === e.target.value); if (s) loadSearch(s); e.target.value = '' }}
                  defaultValue=""
                  style={{ fontSize: '12px', padding: '7px 10px', border: '1px solid #b0c0d8', borderRadius: '6px', color: '#374151', background: '#fff', maxWidth: 160 }}
                >
                  <option value="">📂 Saved ({savedSearches.length})</option>
                  {savedSearches.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {activeFilters > 0 && (
              <button onClick={clearFilters} style={{ fontSize: '12px', padding: '7px 12px', border: '1px solid #d1d9e6', borderRadius: '6px', background: '#fff', color: '#6b7280', cursor: 'pointer' }}>
                Clear ✕
              </button>
            )}
          </div>

          {/* Expanded filter panel */}
          {filterOpen && (
            <div style={{ marginTop: 12, padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>

                {/* Department */}
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4, fontWeight: 500 }}>DEPARTMENT</label>
                  <select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)}
                    style={{ width: '100%', fontSize: '12px', padding: '7px 8px', border: '1px solid #b0c0d8', borderRadius: '5px', color: '#374151', background: '#fff' }}>
                    <option value="">All Departments</option>
                    {agencies.map(a => <option key={a.slug} value={a.slug}>{a.slug}</option>)}
                  </select>
                </div>

                {/* State */}
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4, fontWeight: 500 }}>STATE</label>
                  <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
                    style={{ width: '100%', fontSize: '12px', padding: '7px 8px', border: '1px solid #b0c0d8', borderRadius: '5px', color: '#374151', background: '#fff' }}>
                    <option value="">All States</option>
                    <option value="CA">California</option>
                  </select>
                </div>

                {/* County */}
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4, fontWeight: 500 }}>COUNTY</label>
                  <select value={countyFilter} onChange={e => { setCountyFilter(e.target.value); setCityFilter('') }}
                    style={{ width: '100%', fontSize: '12px', padding: '7px 8px', border: '1px solid #b0c0d8', borderRadius: '5px', color: '#374151', background: '#fff' }}>
                    <option value="">All Counties</option>
                    {counties.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4, fontWeight: 500 }}>CITY</label>
                  <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
                    style={{ width: '100%', fontSize: '12px', padding: '7px 8px', border: '1px solid #b0c0d8', borderRadius: '5px', color: '#374151', background: '#fff' }}>
                    <option value="">All Cities</option>
                    {citiesForCounty.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Topic */}
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4, fontWeight: 500 }}>TOPIC</label>
                  <select value={tagFilter} onChange={e => setTagFilter(e.target.value)}
                    style={{ width: '100%', fontSize: '12px', padding: '7px 8px', border: '1px solid #b0c0d8', borderRadius: '5px', color: '#374151', background: '#fff' }}>
                    <option value="">All Topics</option>
                    {tags.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Date range */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4, fontWeight: 500 }}>DATE RANGE</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {DATE_PRESETS.map(p => (
                      <button
                        key={p.value}
                        onClick={() => { setDatePreset(p.value); if (p.value !== 'custom') { setDateFrom(''); setDateTo('') } }}
                        style={{
                          fontSize: '11px', padding: '4px 10px',
                          borderRadius: '20px', cursor: 'pointer',
                          border: `1px solid ${datePreset === p.value ? '#1b3a6b' : '#d1d9e6'}`,
                          background: datePreset === p.value ? '#1b3a6b' : '#fff',
                          color: datePreset === p.value ? '#fff' : '#374151',
                          fontWeight: datePreset === p.value ? 600 : 400,
                        }}
                      >{p.label}</button>
                    ))}
                  </div>
                  {datePreset === 'custom' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        style={{ fontSize: '12px', padding: '6px 8px', border: '1px solid #b0c0d8', borderRadius: '5px' }} />
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>to</span>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        style={{ fontSize: '12px', padding: '6px 8px', border: '1px solid #b0c0d8', borderRadius: '5px' }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Active filter chips */}
              {activeFilters > 0 && (
                <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>Active:</span>
                  {search && <Chip label={`"${search}"`} onRemove={() => setSearch('')} />}
                  {agencyFilter && <Chip label={agencyFilter} onRemove={() => setAgencyFilter('')} />}
                  {stateFilter && <Chip label={stateFilter} onRemove={() => setStateFilter('')} />}
                  {countyFilter && <Chip label={countyFilter} onRemove={() => setCountyFilter('')} />}
                  {cityFilter && <Chip label={cityFilter} onRemove={() => setCityFilter('')} />}
                  {tagFilter && <Chip label={tagFilter} onRemove={() => setTagFilter('')} />}
                  {(datePreset || dateFrom) && <Chip label={dateLabel} onRemove={() => { setDatePreset(''); setDateFrom(''); setDateTo('') }} />}
                </div>
              )}
            </div>
          )}

          {/* Results count */}
          <div style={{ marginTop: 8, fontSize: '12px', color: '#6b7280' }}>
            {loading ? 'Loading...' : (
              <>Showing <strong style={{ color: '#1b3a6b' }}>{releases.length}</strong> of <strong style={{ color: '#1b3a6b' }}>{totalCount}</strong> releases</>
            )}
          </div>
        </div>
      </div>

      {/* News feed */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: '6px', height: '100px', border: '0.5px solid #d1d9e6' }} />
            ))}
          </div>
        ) : releases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9aa5b4' }}>
            <div style={{ fontSize: '32px', marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>No releases found</div>
            <div style={{ fontSize: '13px', marginBottom: 16 }}>Try adjusting your filters</div>
            <button onClick={clearFilters} style={{ fontSize: '13px', padding: '8px 18px', border: '1px solid #d1d9e6', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Clear all filters</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {releases.map(r => <NewsCard key={r.id} release={r} onClick={setSelectedRelease} />)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: '#1b3a6b', borderTop: '3px solid #f5a623', padding: '16px 20px', marginTop: '40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#93c5fd', fontSize: '11px' }}>© 2026 CAGovNews.com · All content sourced from official California .gov websites · Not affiliated with the State of California</span>
          <div style={{ display: 'flex', gap: '16px' }}>
            {['Privacy', 'Contact', 'RSS'].map(l => <span key={l} style={{ color: '#93c5fd', fontSize: '11px', cursor: 'pointer' }}>{l}</span>)}
          </div>
        </div>
      </div>

      {/* Article modal */}
      {selectedRelease && <ArticleModal release={selectedRelease} onClose={() => setSelectedRelease(null)} />}

      {/* Save search modal */}
      {saveModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setSaveModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '28px', width: '100%', maxWidth: '380px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1b3a6b', marginBottom: '6px' }}>Save this search</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
              {activeFilters === 0 ? 'No filters active — saves current sort only.' : `Saves ${activeFilters} active filter${activeFilters > 1 ? 's' : ''}.`}
            </div>
            <input
              autoFocus
              type="text" value={saveName} onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveSearch()}
              placeholder="e.g. LA County Housing News"
              style={{ width: '100%', fontSize: '14px', padding: '9px 12px', border: '1px solid #b0c0d8', borderRadius: '6px', boxSizing: 'border-box', marginBottom: 12, outline: 'none' }}
            />
            {/* Preview of filters being saved */}
            <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: '#6b7280' }}>
              {[
                search && `Keyword: "${search}"`,
                agencyFilter && `Dept: ${agencyFilter}`,
                stateFilter && `State: ${stateFilter}`,
                countyFilter && `County: ${countyFilter}`,
                cityFilter && `City: ${cityFilter}`,
                tagFilter && `Topic: ${tagFilter}`,
                (datePreset || dateFrom) && `Date: ${dateLabel}`,
                sortBy !== 'date_desc' && `Sort: ${SORT_OPTIONS.find(o => o.value === sortBy)?.label}`,
              ].filter(Boolean).map((f, i) => <div key={i}>· {f}</div>)}
              {activeFilters === 0 && <div>· No filters</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setSaveModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #d1d9e6', borderRadius: '6px', background: '#fff', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveSearch} disabled={!saveName.trim()} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: saveName.trim() ? '#1b3a6b' : '#e2e8f0', color: saveName.trim() ? '#fff' : '#9aa5b4', fontSize: '13px', fontWeight: 600, cursor: saveName.trim() ? 'pointer' : 'not-allowed' }}>Save Search</button>
            </div>
          </div>
        </div>
      )}

      {/* Saved searches manager */}
      {savedSearches.length > 0 && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 500 }}>
          {savedMsg && (
            <div style={{ background: '#1b3a6b', color: '#fff', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s' }}>
              🔖 {savedMsg}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Chip({ label, onRemove }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e8eef8', color: '#1b3a6b', fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: 500 }}>
      {label}
      <span onClick={onRemove} style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#6b7280' }}>✕</span>
    </span>
  )
}
