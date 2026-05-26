'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
  'Wildfire':           { bg: '#fef3c7', color: '#92400e' },
  'Climate':            { bg: '#d1fae5', color: '#065f46' },
  'Health':             { bg: '#ede9fe', color: '#4c1d95' },
  'Enforcement':        { bg: '#fee2e2', color: '#7f1d1d' },
  'Housing':            { bg: '#dbeafe', color: '#1e3a8a' },
  'Elections':          { bg: '#fce7f3', color: '#831843' },
  'Technology':         { bg: '#e0f2fe', color: '#075985' },
  'Agriculture':        { bg: '#f0fdf4', color: '#14532d' },
  'Procurement':        { bg: '#dbeafe', color: '#1e3a8a' },
  'Budget':             { bg: '#fef9c3', color: '#713f12' },
  'Public Safety':      { bg: '#fee2e2', color: '#7f1d1d' },
  'Environment':        { bg: '#d1fae5', color: '#065f46' },
  'Water':              { bg: '#e0f2fe', color: '#075985' },
  'Privacy':            { bg: '#ede9fe', color: '#4c1d95' },
  'Insurance':          { bg: '#fce7f3', color: '#831843' },
  'Veterans':           { bg: '#f0fdf4', color: '#14532d' },
  'Appointments':       { bg: '#f1f5f9', color: '#334155' },
  'Energy':             { bg: '#fef3c7', color: '#78350f' },
  'Disaster Relief':    { bg: '#fee2e2', color: '#7f1d1d' },
  'Consumer Protection':{ bg: '#d1fae5', color: '#065f46' },
  'Grants':             { bg: '#fef3c7', color: '#92400e' },
  'Civil Rights':       { bg: '#ede9fe', color: '#4c1d95' },
  'Education':          { bg: '#dbeafe', color: '#1e3a8a' },
  'Legislation':        { bg: '#f1f5f9', color: '#334155' },
}

function getTagStyle(tag) {
  return TAG_STYLES[tag] || { bg: '#f1f5f9', color: '#334155' }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function AgencyBadge({ slug }) {
  const color = AGENCY_COLORS[slug] ?? '#1a5276'
  return (
    <span style={{
      background: color, color: '#fff', fontSize: '11px',
      fontWeight: 600, padding: '3px 8px', borderRadius: '4px',
      whiteSpace: 'nowrap', letterSpacing: '0.02em'
    }}>{slug}</span>
  )
}

function TagBadge({ tag }) {
  const { bg, color } = getTagStyle(tag)
  return (
    <span style={{
      background: bg, color, fontSize: '11px',
      padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap'
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
        Read on {release.agency_slug.toLowerCase().replace(/ /g,'-')}.ca.gov →
      </div>
    </div>
  )
}

function ArticleModal({ release, onClose }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('release_content')
        .select('extracted_text, scrape_status')
        .eq('release_id', release.id)
        .single()
      setContent(data)
      setLoading(false)
    }
    fetch()
  }, [release.id])

  const agencyColor = AGENCY_COLORS[release.agency_slug] ?? '#1b3a6b'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 1000, display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', padding: '40px 16px', overflowY: 'auto'
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#fff', borderRadius: '10px', maxWidth: '740px',
        width: '100%', padding: '32px', position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', fontSize: '20px',
            cursor: 'pointer', color: '#6b7280', lineHeight: 1
          }}
        >✕</button>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <AgencyBadge slug={release.agency_slug} />
          {release.tag && <TagBadge tag={release.tag} />}
        </div>

        <div style={{ fontSize: '11px', color: '#9aa5b4', marginBottom: '12px' }}>
          {formatDate(release.published_date)}
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1b3a6b', lineHeight: 1.3, marginBottom: '14px' }}>
          {release.title}
        </h1>

        {release.summary && (
          <p style={{ fontSize: '15px', color: '#374151', lineHeight: 1.7, marginBottom: '20px', borderLeft: `3px solid ${agencyColor}`, paddingLeft: '14px' }}>
            {release.summary}
          </p>
        )}

        <hr style={{ border: 'none', borderTop: '0.5px solid #e5e7eb', margin: '20px 0' }} />

        {loading ? (
          <div style={{ color: '#9aa5b4', fontSize: '13px' }}>Loading full article...</div>
        ) : content?.extracted_text && content.scrape_status === 'ok' ? (
          <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {content.extracted_text.slice(0, 4000)}
            {content.extracted_text.length > 4000 && '…'}
          </div>
        ) : (
          <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '6px', padding: '12px 16px', fontSize: '13px', color: '#92400e', marginBottom: '16px' }}>
            Full article content will be available after the next crawler run.
          </div>
        )}

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '0.5px solid #e5e7eb' }}>
          <a
            href={release.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#1b3a6b', color: '#fff', padding: '10px 18px',
              borderRadius: '6px', fontSize: '13px', fontWeight: 500,
              textDecoration: 'none'
            }}
          >
            View original on {release.source_url.replace(/https?:\/\//, '').split('/')[0]} ↗
          </a>
        </div>
      </div>
    </div>
  )
}

export default function CAGovNewsHomepage() {
  const [releases, setReleases] = useState([])
  const [agencies, setAgencies] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [agencyFilter, setAgencyFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedRelease, setSelectedRelease] = useState(null)
  const [totalCount, setTotalCount] = useState(0)

  // Load agencies and tags once
  useEffect(() => {
    supabase.from('agencies').select('slug, name').eq('active', true).order('slug')
      .then(({ data }) => setAgencies(data ?? []))
    supabase.from('releases').select('tag').not('tag', 'is', null)
      .then(({ data }) => {
        const unique = [...new Set((data ?? []).map(r => r.tag))].sort()
        setTags(unique)
      })
    supabase.from('releases').select('id', { count: 'exact', head: true })
      .then(({ count }) => setTotalCount(count ?? 0))
  }, [])

  // Fetch releases on filter change
  const fetchReleases = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('releases').select('*').order('published_date', { ascending: false }).limit(200)
    if (agencyFilter) q = q.eq('agency_slug', agencyFilter)
    if (tagFilter) q = q.eq('tag', tagFilter)
    if (dateFrom) q = q.gte('published_date', dateFrom)
    if (dateTo) q = q.lte('published_date', dateTo)
    if (search) q = q.or(`title.ilike.%${search}%,summary.ilike.%${search}%`)
    const { data } = await q
    setReleases(data ?? [])
    setLoading(false)
  }, [agencyFilter, tagFilter, dateFrom, dateTo, search])

  useEffect(() => { fetchReleases() }, [fetchReleases])

  const clearFilters = () => {
    setSearch(''); setAgencyFilter(''); setTagFilter(''); setDateFrom(''); setDateTo('')
  }
  const hasFilters = search || agencyFilter || tagFilter || dateFrom || dateTo

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
          <button style={{ background: '#f5a623', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: '#1b3a6b', cursor: 'pointer' }}>
            Subscribe
          </button>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #d1d9e6', padding: '12px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search news titles and summaries..."
              style={{ flex: '1', minWidth: '200px', fontSize: '13px', padding: '7px 12px', border: '1px solid #b0c0d8', borderRadius: '4px' }}
            />
            <select value={agencyFilter} onChange={e => setAgencyFilter(e.target.value)}
              style={{ fontSize: '12px', padding: '7px 10px', border: '1px solid #b0c0d8', borderRadius: '4px', color: '#374151' }}>
              <option value="">All Departments</option>
              {agencies.map(a => <option key={a.slug} value={a.slug}>{a.slug}</option>)}
            </select>
            <select value={tagFilter} onChange={e => setTagFilter(e.target.value)}
              style={{ fontSize: '12px', padding: '7px 10px', border: '1px solid #b0c0d8', borderRadius: '4px', color: '#374151' }}>
              <option value="">All Topics</option>
              {tags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ fontSize: '12px', padding: '7px 8px', border: '1px solid #b0c0d8', borderRadius: '4px' }} />
            <span style={{ fontSize: '12px', color: '#6b7280' }}>to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ fontSize: '12px', padding: '7px 8px', border: '1px solid #b0c0d8', borderRadius: '4px' }} />
            {hasFilters && (
              <button onClick={clearFilters}
                style={{ fontSize: '12px', padding: '7px 12px', border: '1px solid #d1d9e6', borderRadius: '4px', background: '#fff', color: '#6b7280', cursor: 'pointer' }}>
                Clear filters ✕
              </button>
            )}
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
            {loading ? 'Loading...' : (
              <>Showing <strong style={{ color: '#1b3a6b' }}>{releases.length}</strong> of <strong style={{ color: '#1b3a6b' }}>{totalCount}</strong> releases
                {agencyFilter && ` · ${agencyFilter}`}
                {tagFilter && ` · ${tagFilter}`}
                {search && ` · "${search}"`}
              </>
            )}
          </div>
        </div>
      </div>

      {/* News feed */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: '6px', height: '100px', border: '0.5px solid #d1d9e6', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : releases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9aa5b4' }}>
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>No releases found</div>
            <div style={{ fontSize: '13px' }}>Try adjusting your filters</div>
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
    </div>
  )
}
