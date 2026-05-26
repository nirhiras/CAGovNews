// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type AgencyHealth = {
  agency_slug: string
  release_count: number
  last_release: string
  archived_count: number
  failed_count: number
}

type DailyCount = {
  day: string
  count: number
}

type Stats = {
  total_releases: number
  total_agencies: number
  archived_ok: number
  archived_failed: number
  total_users: number
  total_crawls: number
}

function healthStatus(agency: AgencyHealth): 'healthy' | 'warning' | 'error' {
  const daysSinceRelease = Math.floor(
    (Date.now() - new Date(agency.last_release).getTime()) / (1000 * 60 * 60 * 24)
  )
  const failRate = agency.archived_count > 0 ? agency.failed_count / agency.archived_count : 0
  if (failRate > 0.5 || daysSinceRelease > 30) return 'error'
  if (failRate > 0.1 || daysSinceRelease > 14) return 'warning'
  return 'healthy'
}

function StatusDot({ status }: { status: 'healthy' | 'warning' | 'error' }) {
  const colors = { healthy: '#22c55e', warning: '#f59e0b', error: '#ef4444' }
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8,
      borderRadius: '50%', background: colors[status],
      boxShadow: `0 0 6px ${colors[status]}`,
      flexShrink: 0,
    }} />
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: '#0f1923', border: '1px solid #1e2d3d',
      borderRadius: 10, padding: '20px 24px',
      borderLeft: `3px solid ${accent ?? '#3b82f6'}`,
    }}>
      <div style={{ fontSize: 11, color: '#4a6a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, fontFamily: 'monospace' }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: '#e2eaf4', lineHeight: 1, fontFamily: 'monospace' }}>{value.toLocaleString()}</div>
      {sub && <div style={{ fontSize: 12, color: '#4a6a8a', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(2, Math.round((value / max) * 100))
  return (
    <div style={{ height: 4, background: '#1e2d3d', borderRadius: 2, overflow: 'hidden', width: '100%', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: '#3b82f6', borderRadius: 2, transition: 'width 0.5s ease' }} />
    </div>
  )
}

function ActivityChart({ data }: { data: DailyCount[] }) {
  const sorted = [...data].sort((a, b) => a.day.localeCompare(b.day)).slice(-14)
  const max = Math.max(...sorted.map(d => d.count), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
      {sorted.map((d, i) => {
        const h = Math.max(2, Math.round((d.count / max) * 60))
        return (
          <div key={i} title={`${d.day}: ${d.count}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: '100%', height: h, background: '#3b82f6', borderRadius: '2px 2px 0 0', opacity: 0.8 }} />
          </div>
        )
      })}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [agencies, setAgencies] = useState<AgencyHealth[]>([])
  const [daily, setDaily] = useState<DailyCount[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'healthy' | 'warning' | 'error'>('all')
  const [lastRefresh, setLastRefresh] = useState(new Date())

  async function load() {
    setLoading(true)

    const [statsRes, agencyRes, dailyRes] = await Promise.all([
      supabase.rpc('get_admin_stats').single(),
      supabase.from('admin_agency_health').select('*').order('release_count', { ascending: false }),
      supabase.from('admin_daily_counts').select('*').order('day', { ascending: false }).limit(30),
    ])

    // Fallback raw queries if views don't exist yet
    const [s, a, d] = await Promise.all([
      supabase.from('releases').select('id', { count: 'exact', head: true }),
      supabase.rpc('admin_agency_health_raw') as any,
      supabase.from('releases')
        .select('published_date')
        .gte('published_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
    ])

    // Compute stats client-side from available tables
    const [
      releasesTotal,
      agenciesActive,
      archivedOk,
      archivedFailed,
      usersTotal,
    ] = await Promise.all([
      supabase.from('releases').select('id', { count: 'exact', head: true }),
      supabase.from('agencies').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('release_content').select('release_id', { count: 'exact', head: true }).eq('scrape_status', 'ok'),
      supabase.from('release_content').select('release_id', { count: 'exact', head: true }).eq('scrape_status', 'failed'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ])

    setStats({
      total_releases: releasesTotal.count ?? 0,
      total_agencies: agenciesActive.count ?? 0,
      archived_ok: archivedOk.count ?? 0,
      archived_failed: archivedFailed.count ?? 0,
      total_users: usersTotal.count ?? 0,
      total_crawls: 0,
    })

    // Agency health — group client-side from releases + release_content
    const { data: releases } = await supabase
      .from('releases')
      .select('id, agency_slug, published_date, release_content(scrape_status)')

    if (releases) {
      const byAgency: Record<string, AgencyHealth> = {}
      for (const r of releases) {
        if (!byAgency[r.agency_slug]) {
          byAgency[r.agency_slug] = {
            agency_slug: r.agency_slug,
            release_count: 0,
            last_release: r.published_date,
            archived_count: 0,
            failed_count: 0,
          }
        }
        const ag = byAgency[r.agency_slug]
        ag.release_count++
        if (r.published_date > ag.last_release) ag.last_release = r.published_date
        const rc = r.release_content as any
        if (rc) {
          ag.archived_count++
          if (rc.scrape_status === 'failed') ag.failed_count++
        }
      }
      setAgencies(Object.values(byAgency).sort((a, b) => b.release_count - a.release_count))

      // Daily counts
      const dayCounts: Record<string, number> = {}
      for (const r of releases) {
        const day = r.published_date?.slice(0, 10)
        if (day && day >= new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)) {
          dayCounts[day] = (dayCounts[day] ?? 0) + 1
        }
      }
      setDaily(Object.entries(dayCounts).map(([day, count]) => ({ day, count })))
    }

    setLastRefresh(new Date())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filteredAgencies = agencies.filter(a => filter === 'all' || healthStatus(a) === filter)
  const maxReleases = Math.max(...agencies.map(a => a.release_count), 1)

  const healthCounts = {
    healthy: agencies.filter(a => healthStatus(a) === 'healthy').length,
    warning: agencies.filter(a => healthStatus(a) === 'warning').length,
    error: agencies.filter(a => healthStatus(a) === 'error').length,
  }

  const archiveRate = stats ? Math.round((stats.archived_ok / Math.max(stats.total_releases, 1)) * 100) : 0

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080f18',
      color: '#e2eaf4',
      fontFamily: "'DM Mono', 'Courier New', monospace",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #1e2d3d',
        padding: '0 32px',
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0a1520',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ color: '#4a6a8a', fontSize: 12, textDecoration: 'none', letterSpacing: '0.05em' }}>← cagovnews</a>
          <span style={{ color: '#1e2d3d' }}>|</span>
          <span style={{ fontSize: 13, color: '#e2eaf4', fontWeight: 600, letterSpacing: '0.05em' }}>ADMIN DASHBOARD</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 11, color: '#4a6a8a' }}>
            refreshed {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={load}
            disabled={loading}
            style={{
              background: loading ? '#1e2d3d' : '#1d3a5f',
              border: '1px solid #2a4a7a',
              color: loading ? '#4a6a8a' : '#93c5fd',
              padding: '6px 14px', borderRadius: 6,
              fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 32 }}>
          <StatCard label="Total Releases" value={stats?.total_releases ?? '—'} accent="#3b82f6" />
          <StatCard label="Active Agencies" value={stats?.total_agencies ?? '—'} accent="#22c55e" />
          <StatCard label="Archived OK" value={stats?.archived_ok ?? '—'} sub={`${archiveRate}% archive rate`} accent="#22c55e" />
          <StatCard label="Archive Failures" value={stats?.archived_failed ?? '—'} accent="#ef4444" />
          <StatCard label="Registered Users" value={stats?.total_users ?? '—'} accent="#a78bfa" />
        </div>

        {/* Activity chart + health summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32 }}>
          <div style={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 10, padding: 24 }}>
            <div style={{ fontSize: 11, color: '#4a6a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Releases — Last 14 Days</div>
            <ActivityChart data={daily} />
          </div>
          <div style={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 10, padding: 24 }}>
            <div style={{ fontSize: 11, color: '#4a6a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Agency Health Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(['healthy', 'warning', 'error'] as const).map(s => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StatusDot status={s} />
                  <span style={{ fontSize: 12, color: '#8aabc4', textTransform: 'capitalize', width: 60 }}>{s}</span>
                  <div style={{ flex: 1, height: 4, background: '#1e2d3d', borderRadius: 2 }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.round(healthCounts[s] / Math.max(agencies.length, 1) * 100)}%`,
                      background: s === 'healthy' ? '#22c55e' : s === 'warning' ? '#f59e0b' : '#ef4444',
                      borderRadius: 2,
                    }} />
                  </div>
                  <span style={{ fontSize: 12, color: '#e2eaf4', fontWeight: 600, width: 24, textAlign: 'right' }}>{healthCounts[s]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agency table */}
        <div style={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{
            padding: '16px 24px', borderBottom: '1px solid #1e2d3d',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: 11, color: '#4a6a8a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Agency Health — {filteredAgencies.length} agencies
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'healthy', 'warning', 'error'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    background: filter === f ? '#1d3a5f' : 'transparent',
                    border: `1px solid ${filter === f ? '#2a4a7a' : '#1e2d3d'}`,
                    color: filter === f ? '#93c5fd' : '#4a6a8a',
                    padding: '4px 10px', borderRadius: 5,
                    fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                    textTransform: 'capitalize',
                  }}
                >
                  {f} {f !== 'all' && `(${healthCounts[f as keyof typeof healthCounts]})`}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e2d3d' }}>
                  {['Status', 'Agency', 'Releases', 'Archived', 'Failed', 'Fail %', 'Last Release'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      color: '#4a6a8a', fontWeight: 400, letterSpacing: '0.05em',
                      fontSize: 10, textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1e2d3d' }}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} style={{ padding: '12px 16px' }}>
                          <div style={{ height: 12, background: '#1e2d3d', borderRadius: 3, width: j === 1 ? 80 : 40 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredAgencies.map(agency => {
                  const status = healthStatus(agency)
                  const failPct = agency.archived_count > 0
                    ? Math.round((agency.failed_count / agency.archived_count) * 100)
                    : 0
                  const daysSince = Math.floor(
                    (Date.now() - new Date(agency.last_release).getTime()) / (1000 * 60 * 60 * 24)
                  )

                  return (
                    <tr key={agency.agency_slug}
                      style={{ borderBottom: '1px solid #111d29', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#0d1825')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <StatusDot status={status} />
                      </td>
                      <td style={{ padding: '12px 16px', color: '#c8d8ea', fontWeight: 600 }}>
                        {agency.agency_slug}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#8aabc4' }}>
                        <div>{agency.release_count}</div>
                        <MiniBar value={agency.release_count} max={maxReleases} />
                      </td>
                      <td style={{ padding: '12px 16px', color: '#8aabc4' }}>{agency.archived_count}</td>
                      <td style={{ padding: '12px 16px', color: agency.failed_count > 0 ? '#ef4444' : '#4a6a8a' }}>
                        {agency.failed_count}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          color: failPct > 50 ? '#ef4444' : failPct > 10 ? '#f59e0b' : '#4a6a8a',
                          fontWeight: failPct > 0 ? 600 : 400,
                        }}>{failPct}%</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: daysSince > 14 ? '#f59e0b' : '#4a6a8a' }}>
                        {daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince}d ago`}
                        <div style={{ fontSize: 10, color: '#2a4a6a', marginTop: 2 }}>{agency.last_release}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
