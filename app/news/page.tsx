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
  'FI$Cal': '#1a5276', 'CDCR': '#7b1d1d',
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
  { label: 'Today',         value: 'today' },
  { label: 'Yesterday',     value: 'yesterday' },
  { label: 'Last 7 days',   value: 'last7' },
  { label: 'Last 15 days',  value: 'last15' },
  { label: 'Last 30 days',  value: 'last30' },
  { label: 'Last 60 days',  value: 'last60' },
  { label: 'Last 180 days', value: 'last180' },
  { label: 'This week',     value: 'thisWeek' },
  { label: 'Last week',     value: 'lastWeek' },
  { label: 'This month',    value: 'thisMonth' },
  { label: 'Last month',    value: 'lastMonth' },
  { label: 'This quarter',  value: 'thisQuarter' },
  { label: 'Last quarter',  value: 'lastQuarter' },
  { label: 'This year',     value: 'thisYear' },
  { label: 'Last year',     value: 'lastYear' },
  { label: 'Custom range',  value: 'custom' },
]

const SORT_OPTIONS = [
  { label: 'Newest first',   value: 'date_desc' },
  { label: 'Oldest first',   value: 'date_asc' },
  { label: 'A → Z',          value: 'title_asc' },
  { label: 'Z → A',          value: 'title_desc' },
  { label: 'Department A→Z', value: 'agency_asc' },
]

const STATES = [
  { code: 'CA', name: 'California' },
  { code: 'NY', name: 'New York' },
  { code: 'TX', name: 'Texas' },
  { code: 'FL', name: 'Florida' },
]

// ── localStorage helpers ──────────────────────────────────────

const LS_SAVED    = 'cagov_saved_articles'
const LS_FAVS     = 'cagov_fav_articles'
const LS_SEARCHES = 'cagovnews_saved_searches'

function lsGet(key) { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

// ── Date helpers ──────────────────────────────────────────────

function getDateRange(preset) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const fmt = (d) => d.toISOString().split('T')[0]
  const sub = (d, n) => { const x = new Date(d); x.setDate(x.getDate() - n); return x }
  const dow = now.getDay()
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
      return { from: fmt(new Date(end.getFullYear(), end.getMonth(), 1)), to: fmt(end) }
    }
    case 'thisQuarter':  return { from: fmt(startOfQuarter), to: today }
    case 'lastQuarter': {
      const end = new Date(startOfQuarter.getTime() - 1)
      return { from: fmt(new Date(end.getFullYear(), Math.floor(end.getMonth() / 3) * 3, 1)), to: fmt(end) }
    }
    case 'thisYear':     return { from: fmt(startOfYear), to: today }
    case 'lastYear':     return { from: `${now.getFullYear() - 1}-01-01`, to: `${now.getFullYear() - 1}-12-31` }
    default:             return { from: '', to: '' }
  }
}

function getTagStyle(tag) { return TAG_STYLES[tag] || { bg: '#f1f5f9', color: '#334155' } }
function formatDate(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

// ── Multi-select dropdown ─────────────────────────────────────

function MultiSelect({ label, options, selected, onChange, placeholder = 'All', maxWidth = 200 }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o =>
    !search || (typeof o === 'string' ? o : o.label || o.name || o.slug || o)
      .toLowerCase().includes(search.toLowerCase())
  )

  const getVal = (o) => typeof o === 'string' ? o : o.value ?? o.code ?? o.slug ?? o
  const getLbl = (o) => typeof o === 'string' ? o : o.label ?? o.name ?? o.slug ?? o

  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
  }

  const displayText = selected.length === 0
    ? placeholder
    : selected.length === 1
    ? getLbl(options.find(o => getVal(o) === selected[0]) ?? selected[0])
    : `${selected.length} selected`

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 140, maxWidth }}>
      <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, padding: '7px 10px', border: `1px solid ${open || selected.length > 0 ? '#1b3a6b' : '#b0c0d8'}`,
          borderRadius: 6, background: selected.length > 0 ? '#eef2ff' : '#fff',
          color: '#374151', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: selected.length > 0 ? '#1b3a6b' : '#6b7280', fontWeight: selected.length > 0 ? 600 : 400 }}>
          {displayText}
        </span>
        <span style={{ marginLeft: 6, fontSize: 10, color: '#9aa5b4', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 500,
          background: '#fff', border: '1px solid #d1d9e6', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4,
          minWidth: 200, maxHeight: 280, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          {options.length > 8 && (
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
              <input
                autoFocus
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}...`}
                style={{ width: '100%', fontSize: 12, padding: '5px 8px', border: '1px solid #d1d9e6', borderRadius: 5, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, padding: '6px 10px', borderBottom: '1px solid #f0f0f0' }}>
            <button onClick={() => onChange(filtered.map(getVal))} style={{ fontSize: 11, color: '#1b3a6b', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}>Select all</button>
            <span style={{ color: '#d1d9e6' }}>|</span>
            <button onClick={() => onChange([])} style={{ fontSize: 11, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear</button>
            {selected.length > 0 && <span style={{ fontSize: 11, color: '#9aa5b4', marginLeft: 'auto' }}>{selected.length} selected</span>}
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 200 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 10px', fontSize: 12, color: '#9aa5b4', textAlign: 'center' }}>No results</div>
            ) : filtered.map((o) => {
              const val = getVal(o)
              const lbl = getLbl(o)
              const checked = selected.includes(val)
              return (
                <div
                  key={val}
                  onClick={() => toggle(val)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', cursor: 'pointer', fontSize: 12,
                    background: checked ? '#f0f4ff' : 'transparent',
                    color: checked ? '#1b3a6b' : '#374151',
                  }}
                  onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#f8fafc' }}
                  onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{
                    width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                    border: `2px solid ${checked ? '#1b3a6b' : '#b0c0d8'}`,
                    background: checked ? '#1b3a6b' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {checked && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{ fontWeight: checked ? 500 : 400 }}>{lbl}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Date range dropdown ───────────────────────────────────────

function DateRangeSelect({ datePreset, dateFrom, dateTo, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const hasValue = datePreset || dateFrom
  const label = datePreset
    ? DATE_PRESETS.find(p => p.value === datePreset)?.label
    : (dateFrom || dateTo)
    ? `${dateFrom}${dateTo ? ' → ' + dateTo : ''}`
    : 'All time'

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 160 }}>
      <label style={{ fontSize: 10, color: '#6b7280', display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DATE RANGE</label>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, padding: '7px 10px', border: `1px solid ${open || hasValue ? '#1b3a6b' : '#b0c0d8'}`,
          borderRadius: 6, background: hasValue ? '#eef2ff' : '#fff',
          color: hasValue ? '#1b3a6b' : '#6b7280', cursor: 'pointer', fontFamily: 'inherit',
          fontWeight: hasValue ? 600 : 400, boxSizing: 'border-box',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>{label}</span>
        <span style={{ marginLeft: 6, fontSize: 10, color: '#9aa5b4', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 500,
          background: '#fff', border: '1px solid #d1d9e6', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4,
          width: 220, overflow: 'hidden',
        }}>
          <div
            onClick={() => { onChange({ preset: '', from: '', to: '' }); setOpen(false) }}
            style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', color: '#6b7280', borderBottom: '1px solid #f0f0f0' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >All time</div>

          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {DATE_PRESETS.filter(p => p.value !== 'custom').map(p => (
              <div
                key={p.value}
                onClick={() => { onChange({ preset: p.value, from: '', to: '' }); setOpen(false) }}
                style={{
                  padding: '8px 12px', fontSize: 12, cursor: 'pointer',
                  background: datePreset === p.value ? '#eef2ff' : 'transparent',
                  color: datePreset === p.value ? '#1b3a6b' : '#374151',
                  fontWeight: datePreset === p.value ? 600 : 400,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
                onMouseEnter={e => { if (datePreset !== p.value) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (datePreset !== p.value) e.currentTarget.style.background = 'transparent' }}
              >
                {p.label}
                {datePreset === p.value && <span style={{ fontSize: 10 }}>✓</span>}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #f0f0f0', padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6, fontWeight: 600 }}>CUSTOM RANGE</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="date" value={dateFrom}
                onChange={e => { onChange({ preset: 'custom', from: e.target.value, to: dateTo }) }}
                style={{ flex: 1, fontSize: 11, padding: '5px 6px', border: '1px solid #b0c0d8', borderRadius: 4 }}
              />
              <span style={{ fontSize: 10, color: '#9aa5b4' }}>→</span>
              <input
                type="date" value={dateTo}
                onChange={e => { onChange({ preset: 'custom', from: dateFrom, to: e.target.value }) }}
                style={{ flex: 1, fontSize: 11, padding: '5px 6px', border: '1px solid #b0c0d8', borderRadius: 4 }}
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setOpen(false) }}
                style={{ marginTop: 8, width: '100%', background: '#1b3a6b', color: '#fff', border: 'none', borderRadius: 5, padding: '6px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
              >Apply</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Chip ──────────────────────────────────────────────────────

function Chip({ label, onRemove }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e8eef8', color: '#1b3a6b', fontSize: '11px', padding: '3px 8px', borderRadius: '20px', fontWeight: 500 }}>
      {label}
      <span onClick={onRemove} style={{ cursor: 'pointer', fontSize: '12px', lineHeight: 1, color: '#6b7280', marginLeft: 2 }}>✕</span>
    </span>
  )
}

// ── Badges ────────────────────────────────────────────────────

function AgencyBadge({ slug }) {
  const color = AGENCY_COLORS[slug] ?? '#1a5276'
  return <span style={{ background: color, color: '#fff', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>{slug}</span>
}

function TagBadge({ tag }) {
  const { bg, color } = getTagStyle(tag)
  return <span style={{ background: bg, color, fontSize: '11px', padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{tag}</span>
}

// ── NewsCard ──────────────────────────────────────────────────

function NewsCard({ release, onClick, isFav, onToggleFav }) {
  const agencyColor = AGENCY_COLORS[release.agency_slug] ?? '#1a5276'
  return (
    <div
      style={{ background: '#fff', border: '0.5px solid #d1d9e6', borderLeft: `3px solid ${agencyColor}`, borderRadius: '0 6px 6px 0', padding: '14px 16px', cursor: 'pointer', transition: 'box-shadow 0.15s', position: 'relative' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Favorite star on card */}
      <button
        onClick={e => { e.stopPropagation(); onToggleFav(release) }}
        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
        style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: isFav ? '#f5a623' : '#d1d9e6', padding: 2, lineHeight: 1 }}
      >
        {isFav ? '★' : '☆'}
      </button>
      <div onClick={() => onClick(release)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px', flexWrap: 'wrap', paddingRight: 24 }}>
          <AgencyBadge slug={release.agency_slug} />
          {release.tag && <TagBadge tag={release.tag} />}
          <span style={{ color: '#9aa5b4', fontSize: '11px', marginLeft: 'auto' }}>{formatDate(release.published_date)}</span>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1b3a6b', lineHeight: 1.4, marginBottom: '5px' }}>{release.title}</div>
        {release.summary && (
          <div style={{ fontSize: '12px', color: '#4a5568', lineHeight: 1.6 }}>
            {release.summary.length > 180 ? release.summary.slice(0, 180) + '…' : release.summary}
          </div>
        )}
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#1b3a6b', fontWeight: 500 }}>
          Read on {release.source_url.replace(/https?:\/\//, '').split('/')[0]} →
        </div>
      </div>
    </div>
  )
}

// ── Action bar button ─────────────────────────────────────────

function AbBtn({ onClick, href, target, title, active, activeStyle, children, danger }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    height: 30, padding: '0 10px', fontSize: 12, fontWeight: 500,
    fontFamily: 'inherit', borderRadius: 6,
    border: `1px solid ${active ? '#a0b8d8' : '#dde3ec'}`,
    background: active ? (activeStyle?.bg || '#e8f0fb') : '#f8fafc',
    color: active ? (activeStyle?.color || '#1b3a6b') : (danger ? '#dc2626' : '#444'),
    cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
    transition: 'background .12s, color .12s',
  }
  if (href) return <a href={href} target={target} rel="noopener noreferrer" title={title} style={base}>{children}</a>
  return <button onClick={onClick} title={title} style={base}>{children}</button>
}

// ── Article Modal ─────────────────────────────────────────────

function ArticleModal({ release, onClose, savedArticles, setSavedArticles, favArticles, setFavArticles }) {
  const [content, setContent]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [toast, setToast]       = useState('')
  const [fbOpen, setFbOpen]     = useState(false)
  const [fbText, setFbText]     = useState('')
  const [fbEmail, setFbEmail]   = useState('')
  const [dlOpen, setDlOpen]     = useState(false)
  const dlRef                   = useRef(null)

  const agencyColor = AGENCY_COLORS[release.agency_slug] ?? '#1b3a6b'
  const url         = release.source_url
  const title       = release.title

  const isSaved = savedArticles.some(a => a.id === release.id)
  const isFav   = favArticles.some(a => a.id === release.id)

  useEffect(() => {
    supabase.from('release_content').select('extracted_text, scrape_status').eq('release_id', release.id).single()
      .then(({ data }) => { setContent(data); setLoading(false) })
  }, [release.id])

  useEffect(() => {
    function handler(e) { if (dlRef.current && !dlRef.current.contains(e.target)) setDlOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  function handleSave() {
    if (isSaved) { showToast('Already saved'); return }
    const updated = [{ id: release.id, title, url, agency: release.agency_slug, tag: release.tag, date: release.published_date, at: new Date().toISOString() }, ...savedArticles]
    setSavedArticles(updated)
    lsSet(LS_SAVED, updated)
    showToast('Article saved ✓')
  }

  function handleFav() {
    let updated
    if (isFav) {
      updated = favArticles.filter(a => a.id !== release.id)
      showToast('Removed from favorites')
    } else {
      updated = [{ id: release.id, title, url, agency: release.agency_slug, tag: release.tag, date: release.published_date, at: new Date().toISOString() }, ...favArticles]
      showToast('Added to favorites ★')
    }
    setFavArticles(updated)
    lsSet(LS_FAVS, updated)
  }

  function handleNativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title, url }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(url).then(() => showToast('Link copied ✓'))
    }
  }

  function handleFbSend() {
    if (!fbText.trim()) { showToast('Please enter feedback'); return }
    const body = encodeURIComponent(fbText + (fbEmail ? '\n\nFrom: ' + fbEmail : ''))
    const sub  = encodeURIComponent('Feedback: ' + title)
    window.location.href = `mailto:feedback@cagovnews.com?subject=${sub}&body=${body}`
    setFbOpen(false)
    showToast('Opening email…')
  }

  const eTitle = encodeURIComponent(title)
  const eUrl   = encodeURIComponent(url)
  const mailto = `mailto:?subject=CAGovNews%3A%20${eTitle}&body=Read%20this%20article%3A%20${eUrl}`
  const xUrl   = `https://twitter.com/intent/tweet?text=${eTitle}&url=${eUrl}`
  const liUrl  = `https://www.linkedin.com/sharing/share-offsite/?url=${eUrl}`

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: '10px', maxWidth: '760px', width: '100%', padding: '28px 32px', position: 'relative' }}>

        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '16px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>✕</button>

        {/* Meta */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <AgencyBadge slug={release.agency_slug} />
          {release.tag && <TagBadge tag={release.tag} />}
        </div>
        <div style={{ fontSize: '11px', color: '#9aa5b4', marginBottom: '10px' }}>{formatDate(release.published_date)}</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1b3a6b', lineHeight: 1.3, marginBottom: '14px' }}>{title}</h1>
        {release.summary && (
          <p style={{ fontSize: '15px', color: '#374151', lineHeight: 1.7, marginBottom: '16px', borderLeft: `3px solid ${agencyColor}`, paddingLeft: '14px' }}>{release.summary}</p>
        )}

        {/* ── Action bar ── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', padding: '12px 0', borderTop: '0.5px solid #e5e7eb', borderBottom: '0.5px solid #e5e7eb', marginBottom: 20 }}>

          <AbBtn onClick={handleSave} title="Save article" active={isSaved} activeStyle={{ bg: '#e8f0fb', color: '#1b3a6b' }}>
            💾 {isSaved ? 'Saved' : 'Save'}
          </AbBtn>

          <AbBtn onClick={handleFav} title={isFav ? 'Remove from favorites' : 'Add to favorites'} active={isFav} activeStyle={{ bg: '#fffbeb', color: '#d97706' }}>
            {isFav ? '★ Favorited' : '☆ Favorite'}
          </AbBtn>

          <span style={{ display: 'inline-block', width: 1, height: 20, background: '#e5e7eb', margin: '0 2px' }} />

          <AbBtn href={mailto} title="Share via email">📧 Email</AbBtn>

          <AbBtn href={xUrl} target="_blank" title="Post on X">𝕏 Post on X</AbBtn>

          <AbBtn href={liUrl} target="_blank" title="Share on LinkedIn">in LinkedIn</AbBtn>

          <AbBtn onClick={handleNativeShare} title="Share on other apps">↗ Share</AbBtn>

          <span style={{ display: 'inline-block', width: 1, height: 20, background: '#e5e7eb', margin: '0 2px' }} />

          {/* Download dropdown */}
          <div ref={dlRef} style={{ position: 'relative' }}>
            <AbBtn onClick={() => setDlOpen(v => !v)} title="Download" active={dlOpen}>
              ⬇ Download ▾
            </AbBtn>
            {dlOpen && (
              <div style={{ position: 'absolute', top: 34, left: 0, background: '#fff', border: '1px solid #dde3ec', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,.10)', minWidth: 180, zIndex: 200, overflow: 'hidden' }}>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 13, color: '#222', textDecoration: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f7fb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  🖨 Open &amp; Print as PDF
                </a>
                <a
                  onClick={() => {
                    const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head><body><h1>${title}</h1><p>${release.summary || ''}</p><p><a href="${url}">${url}</a></p></body></html>`], { type: 'text/html' })
                    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cagov-article.html'; a.click(); URL.revokeObjectURL(a.href)
                    setDlOpen(false)
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 13, color: '#222', textDecoration: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f7fb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  📄 Download HTML
                </a>
              </div>
            )}
          </div>

          <AbBtn onClick={() => setFbOpen(true)} title="Send feedback to CAGovNews">
            💬 Feedback
          </AbBtn>

        </div>

        {/* Article body */}
        <hr style={{ border: 'none', borderTop: '0.5px solid #e5e7eb', margin: '0 0 20px' }} />
        {loading
          ? <div style={{ color: '#9aa5b4', fontSize: '13px' }}>Loading full article...</div>
          : content?.extracted_text && content.scrape_status === 'ok'
          ? <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{content.extracted_text.slice(0, 4000)}{content.extracted_text.length > 4000 && '…'}</div>
          : <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '6px', padding: '12px 16px', fontSize: '13px', color: '#92400e' }}>Full article content will be available after the next crawler run.</div>
        }

        {/* View original */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '0.5px solid #e5e7eb' }}>
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1b3a6b', color: '#fff', padding: '10px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
            View original on {url.replace(/https?:\/\//, '').split('/')[0]} ↗
          </a>
        </div>
      </div>

      {/* Feedback modal */}
      {fbOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setFbOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460, margin: 16, overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e8e8e4' }}>
              <strong style={{ fontSize: 15, fontFamily: 'inherit' }}>Feedback to CAGovNews</strong>
              <button onClick={() => setFbOpen(false)} style={{ background: 'none', border: 'none', fontSize: 17, cursor: 'pointer', color: '#999' }}>✕</button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.5, margin: 0 }}>Your feedback goes directly to the CAGovNews editorial team.</p>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }}>Article</label>
                <input value={title} readOnly style={{ width: '100%', fontSize: 13, padding: '9px 11px', border: '1px solid #dde3ec', borderRadius: 7, background: '#f8f8f6', color: '#888', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }}>Feedback</label>
                <textarea value={fbText} onChange={e => setFbText(e.target.value)} rows={4} placeholder="What would you like us to know?"
                  style={{ width: '100%', fontSize: 13, padding: '9px 11px', border: '1px solid #dde3ec', borderRadius: 7, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }}>Your email (optional)</label>
                <input type="email" value={fbEmail} onChange={e => setFbEmail(e.target.value)} placeholder="you@example.com"
                  style={{ width: '100%', fontSize: 13, padding: '9px 11px', border: '1px solid #dde3ec', borderRadius: 7, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '1px solid #e8e8e4', background: '#fafaf8' }}>
              <button onClick={() => setFbOpen(false)} style={{ height: 34, padding: '0 16px', fontSize: 13, border: '1px solid #dde3ec', background: '#fff', color: '#555', borderRadius: 7, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleFbSend} style={{ height: 34, padding: '0 18px', fontSize: 13, fontWeight: 600, border: 'none', background: '#1b3a6b', color: '#fff', borderRadius: 7, cursor: 'pointer' }}>Send feedback</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 22, right: 22, background: '#1a1a1a', color: '#fff', fontSize: 13, padding: '10px 18px', borderRadius: 9, zIndex: 3000, pointerEvents: 'none' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ── Saved search storage ──────────────────────────────────────

const EMPTY_FILTERS = {
  search: '',
  agencies: [],
  states: [],
  counties: [],
  cities: [],
  tags: [],
  datePreset: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'date_desc',
  favoritesOnly: false,
}

// ── Main ──────────────────────────────────────────────────────

export default function CAGovNewsHomepage() {
  const [releases, setReleases]           = useState([])
  const [allAgencies, setAllAgencies]     = useState([])
  const [allTags, setAllTags]             = useState([])
  const [allCounties, setAllCounties]     = useState([])
  const [allCities, setAllCities]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [totalCount, setTotalCount]       = useState(0)
  const [selectedRelease, setSelectedRelease] = useState(null)

  const [filters, setFilters]             = useState(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen]       = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveName, setSaveName]           = useState('')
  const [savedSearches, setSavedSearches] = useState([])
  const [savedMsg, setSavedMsg]           = useState('')

  // Article save/fav state (persisted to localStorage)
  const [savedArticles, setSavedArticles] = useState([])
  const [favArticles, setFavArticles]     = useState([])

  const setF = (key, val) => setFilters(f => ({ ...f, [key]: val }))

  useEffect(() => {
    setSavedSearches(lsGet(LS_SEARCHES))
    setSavedArticles(lsGet(LS_SAVED))
    setFavArticles(lsGet(LS_FAVS))

    supabase.from('agencies').select('slug, name').eq('active', true).order('slug')
      .then(({ data }) => setAllAgencies((data ?? []).map(a => ({ value: a.slug, label: a.slug }))))

    supabase.from('releases').select('tag').not('tag', 'is', null)
      .then(({ data }) => setAllTags([...new Set((data ?? []).map(r => r.tag))].sort()))

    supabase.from('releases').select('id', { count: 'exact', head: true })
      .then(({ count }) => setTotalCount(count ?? 0))

    supabase.from('news_sources').select('county_name, city_name').not('county_name', 'is', null)
      .then(({ data }) => {
        if (data) {
          setAllCounties([...new Set(data.map(r => r.county_name).filter(Boolean))].sort())
          setAllCities([...new Set(data.map(r => r.city_name).filter(Boolean))].sort())
        }
      })
  }, [])

  const fetchReleases = useCallback(async () => {
    setLoading(true)
    const { search, agencies, tags, datePreset, dateFrom, dateTo, sortBy, favoritesOnly } = filters

    // If favoritesOnly, filter from localStorage
    if (favoritesOnly) {
      const favIds = lsGet(LS_FAVS).map(a => a.id)
      if (favIds.length === 0) { setReleases([]); setLoading(false); return }
      let q = supabase.from('releases').select('*').in('id', favIds).limit(200)
      const { data } = await q
      setReleases(data ?? [])
      setLoading(false)
      return
    }

    let q = supabase.from('releases').select('*').limit(200)

    switch (sortBy) {
      case 'date_asc':   q = q.order('published_date', { ascending: true }); break
      case 'title_asc':  q = q.order('title', { ascending: true }); break
      case 'title_desc': q = q.order('title', { ascending: false }); break
      case 'agency_asc': q = q.order('agency_slug', { ascending: true }); break
      default:           q = q.order('published_date', { ascending: false })
    }

    if (agencies.length === 1) q = q.eq('agency_slug', agencies[0])
    else if (agencies.length > 1) q = q.in('agency_slug', agencies)

    if (tags.length === 1) q = q.eq('tag', tags[0])
    else if (tags.length > 1) q = q.in('tag', tags)

    if (search) q = q.or(`title.ilike.%${search}%,summary.ilike.%${search}%`)

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
  }, [filters])

  useEffect(() => { fetchReleases() }, [fetchReleases])

  function toggleFavOnCard(release) {
    const isFav = favArticles.some(a => a.id === release.id)
    let updated
    if (isFav) {
      updated = favArticles.filter(a => a.id !== release.id)
    } else {
      updated = [{ id: release.id, title: release.title, url: release.source_url, agency: release.agency_slug, tag: release.tag, date: release.published_date, at: new Date().toISOString() }, ...favArticles]
    }
    setFavArticles(updated)
    lsSet(LS_FAVS, updated)
  }

  const resetFilters = () => setFilters(EMPTY_FILTERS)

  const activeCount = [
    filters.search,
    ...filters.agencies,
    ...filters.states,
    ...filters.counties,
    ...filters.cities,
    ...filters.tags,
    filters.datePreset || filters.dateFrom,
    filters.favoritesOnly ? 'fav' : '',
  ].filter(Boolean).length

  const hasFilters = activeCount > 0 || filters.sortBy !== 'date_desc'

  const chips = [
    filters.search && { label: `"${filters.search}"`, clear: () => setF('search', '') },
    filters.favoritesOnly && { label: '★ Favorites', clear: () => setF('favoritesOnly', false) },
    ...filters.agencies.map(a => ({ label: a, clear: () => setF('agencies', filters.agencies.filter(x => x !== a)) })),
    ...filters.states.map(s => ({ label: s, clear: () => setF('states', filters.states.filter(x => x !== s)) })),
    ...filters.counties.map(c => ({ label: c, clear: () => setF('counties', filters.counties.filter(x => x !== c)) })),
    ...filters.cities.map(c => ({ label: c, clear: () => setF('cities', filters.cities.filter(x => x !== c)) })),
    ...filters.tags.map(t => ({ label: t, clear: () => setF('tags', filters.tags.filter(x => x !== t)) })),
    (filters.datePreset || filters.dateFrom) && {
      label: filters.datePreset ? DATE_PRESETS.find(p => p.value === filters.datePreset)?.label : `${filters.dateFrom} → ${filters.dateTo}`,
      clear: () => setFilters(f => ({ ...f, datePreset: '', dateFrom: '', dateTo: '' }))
    },
  ].filter(Boolean)

  const saveSearch = () => {
    if (!saveName.trim()) return
    const entry = { id: Date.now(), name: saveName.trim(), filters, created: new Date().toISOString() }
    const updated = [entry, ...savedSearches]
    setSavedSearches(updated); lsSet(LS_SEARCHES, updated)
    setSaveName(''); setSaveModalOpen(false)
    setSavedMsg(`"${entry.name}" saved`)
    setTimeout(() => setSavedMsg(''), 3000)
  }

  const loadSearch = (entry) => { setFilters(entry.filters); setFilterOpen(false) }
  const deleteSearch = (id) => {
    const updated = savedSearches.filter(s => s.id !== id)
    setSavedSearches(updated); lsSet(LS_SEARCHES, updated)
  }

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
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Favorites shortcut in header */}
            <button
              onClick={() => setF('favoritesOnly', !filters.favoritesOnly)}
              title="Show favorites"
              style={{ background: filters.favoritesOnly ? '#f5a623' : 'transparent', border: `1px solid ${filters.favoritesOnly ? '#f5a623' : '#4a6fa5'}`, borderRadius: 5, padding: '5px 10px', fontSize: 12, color: filters.favoritesOnly ? '#1b3a6b' : '#93c5fd', cursor: 'pointer', fontWeight: filters.favoritesOnly ? 700 : 400 }}>
              ★ {favArticles.length > 0 ? `Favorites (${favArticles.length})` : 'Favorites'}
            </button>
            <button style={{ background: '#f5a623', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: '#1b3a6b', cursor: 'pointer' }}>Subscribe</button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #d1d9e6', padding: '10px 20px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9aa5b4', fontSize: 14 }}>🔍</span>
              <input type="text" value={filters.search} onChange={e => setF('search', e.target.value)}
                placeholder="Search titles and summaries..."
                style={{ width: '100%', fontSize: '13px', padding: '7px 12px 7px 30px', border: '1px solid #b0c0d8', borderRadius: '6px', boxSizing: 'border-box', outline: 'none' }} />
            </div>

            {/* Favorites filter pill */}
            <button
              onClick={() => setF('favoritesOnly', !filters.favoritesOnly)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: filters.favoritesOnly ? '#fffbeb' : '#fff',
                color: filters.favoritesOnly ? '#d97706' : '#374151',
                border: `1px solid ${filters.favoritesOnly ? '#fcd34d' : '#b0c0d8'}`,
                borderRadius: '6px', padding: '7px 12px', fontSize: '12px', fontWeight: filters.favoritesOnly ? 600 : 400, cursor: 'pointer',
              }}>
              {filters.favoritesOnly ? '★' : '☆'} Favorites
            </button>

            {/* Filter toggle */}
            <button onClick={() => setFilterOpen(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: filterOpen || activeCount > 0 ? '#1b3a6b' : '#fff',
              color: filterOpen || activeCount > 0 ? '#fff' : '#374151',
              border: '1px solid #b0c0d8', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
            }}>
              ⚙ Filters
              {activeCount > 0 && <span style={{ background: '#f5a623', color: '#1b3a6b', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>{activeCount}</span>}
            </button>

            {/* Sort */}
            <select value={filters.sortBy} onChange={e => setF('sortBy', e.target.value)}
              style={{ fontSize: '12px', padding: '7px 10px', border: '1px solid #b0c0d8', borderRadius: '6px', color: '#374151', background: '#fff' }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Save search */}
            <button onClick={() => setSaveModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#fff', border: '1px solid #b0c0d8', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
              🔖 Save
            </button>

            {savedSearches.length > 0 && (
              <select onChange={e => { const s = savedSearches.find(x => String(x.id) === e.target.value); if (s) loadSearch(s); e.target.value = '' }} defaultValue=""
                style={{ fontSize: '12px', padding: '7px 10px', border: '1px solid #b0c0d8', borderRadius: '6px', color: '#374151', background: '#fff', maxWidth: 160 }}>
                <option value="">📂 Saved ({savedSearches.length})</option>
                {savedSearches.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}

            {hasFilters && (
              <button onClick={resetFilters} style={{ fontSize: '12px', padding: '7px 12px', border: '1px solid #fca5a5', borderRadius: '6px', background: '#fff5f5', color: '#dc2626', cursor: 'pointer', fontWeight: 500 }}>
                ↺ Reset
              </button>
            )}
          </div>

          {/* Expanded filter panel */}
          {filterOpen && (
            <div style={{ marginTop: 12, padding: '16px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <MultiSelect label="Department" options={allAgencies} selected={filters.agencies} onChange={v => setF('agencies', v)} placeholder="All Departments" maxWidth={200} />
                <MultiSelect label="State" options={STATES.map(s => ({ value: s.code, label: s.name }))} selected={filters.states} onChange={v => setF('states', v)} placeholder="All States" maxWidth={160} />
                <MultiSelect label="County" options={allCounties} selected={filters.counties} onChange={v => { setF('counties', v); setF('cities', []) }} placeholder="All Counties" maxWidth={180} />
                <MultiSelect label="City" options={allCities} selected={filters.cities} onChange={v => setF('cities', v)} placeholder="All Cities" maxWidth={180} />
                <MultiSelect label="Topic" options={allTags} selected={filters.tags} onChange={v => setF('tags', v)} placeholder="All Topics" maxWidth={180} />
                <DateRangeSelect
                  datePreset={filters.datePreset}
                  dateFrom={filters.dateFrom}
                  dateTo={filters.dateTo}
                  onChange={({ preset, from, to }) => setFilters(f => ({ ...f, datePreset: preset, dateFrom: from, dateTo: to }))}
                />
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button onClick={resetFilters} style={{ marginTop: 20, fontSize: '12px', padding: '7px 16px', border: '1px solid #fca5a5', borderRadius: '6px', background: '#fff5f5', color: '#dc2626', cursor: 'pointer', fontWeight: 500 }}>
                    ↺ Reset all
                  </button>
                </div>
              </div>

              {chips.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>Active filters:</span>
                  {chips.map((c, i) => <Chip key={i} label={c.label} onRemove={c.clear} />)}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: '12px', color: '#6b7280' }}>
            {loading ? 'Loading...' : (
              <>{filters.favoritesOnly ? '★ Showing favorites — ' : ''}Showing <strong style={{ color: '#1b3a6b' }}>{releases.length}</strong> of <strong style={{ color: '#1b3a6b' }}>{totalCount}</strong> releases</>
            )}
          </div>
        </div>
      </div>

      {/* News feed */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[...Array(8)].map((_, i) => <div key={i} style={{ background: '#fff', borderRadius: '6px', height: '100px', border: '0.5px solid #d1d9e6' }} />)}
          </div>
        ) : releases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9aa5b4' }}>
            <div style={{ fontSize: '32px', marginBottom: 12 }}>{filters.favoritesOnly ? '★' : '🔍'}</div>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>{filters.favoritesOnly ? 'No favorites yet' : 'No releases found'}</div>
            <div style={{ fontSize: '13px', marginBottom: 16 }}>{filters.favoritesOnly ? 'Star articles to add them here.' : 'Try adjusting your filters'}</div>
            <button onClick={resetFilters} style={{ fontSize: '13px', padding: '8px 18px', border: '1px solid #d1d9e6', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}>Reset filters</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {releases.map(r => (
              <NewsCard
                key={r.id}
                release={r}
                onClick={setSelectedRelease}
                isFav={favArticles.some(a => a.id === r.id)}
                onToggleFav={toggleFavOnCard}
              />
            ))}
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
      {selectedRelease && (
        <ArticleModal
          release={selectedRelease}
          onClose={() => setSelectedRelease(null)}
          savedArticles={savedArticles}
          setSavedArticles={setSavedArticles}
          favArticles={favArticles}
          setFavArticles={setFavArticles}
        />
      )}

      {/* Save search modal */}
      {saveModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setSaveModalOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '28px', width: '100%', maxWidth: '380px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1b3a6b', marginBottom: '6px' }}>Save this search</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
              {chips.length === 0 ? 'No filters active — saves current sort only.' : `Saving ${chips.length} active filter${chips.length > 1 ? 's' : ''}.`}
            </div>
            <input autoFocus type="text" value={saveName} onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveSearch()}
              placeholder="e.g. LA County Housing News"
              style={{ width: '100%', fontSize: '14px', padding: '9px 12px', border: '1px solid #b0c0d8', borderRadius: '6px', boxSizing: 'border-box', marginBottom: 12, outline: 'none' }} />
            <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: '#6b7280', maxHeight: 120, overflowY: 'auto' }}>
              {chips.length === 0 ? <div>· No filters</div> : chips.map((c, i) => <div key={i}>· {c.label}</div>)}
              {filters.sortBy !== 'date_desc' && <div>· Sort: {SORT_OPTIONS.find(o => o.value === filters.sortBy)?.label}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setSaveModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #d1d9e6', borderRadius: '6px', background: '#fff', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveSearch} disabled={!saveName.trim()} style={{ padding: '8px 16px', border: 'none', borderRadius: '6px', background: saveName.trim() ? '#1b3a6b' : '#e2e8f0', color: saveName.trim() ? '#fff' : '#9aa5b4', fontSize: '13px', fontWeight: 600, cursor: saveName.trim() ? 'pointer' : 'not-allowed' }}>Save Search</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {savedMsg && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 3000, background: '#1b3a6b', color: '#fff', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          🔖 {savedMsg}
        </div>
      )}
    </div>
  )
}
