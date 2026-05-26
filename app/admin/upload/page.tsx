// @ts-nocheck
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const REQUIRED = ['slug', 'name', 'news_url', 'level']
const LEVELS = ['federal', 'state', 'county', 'city']

function validateRow(row, idx, existingSlugs, existingUrls, allRows) {
  for (const f of REQUIRED) {
    if (!row[f]) return `Row ${idx + 1}: missing "${f}"`
  }
  if (!LEVELS.includes(row.level)) return `Row ${idx + 1}: level must be federal/state/county/city`
  if (!row.news_url.startsWith('http')) return `Row ${idx + 1}: invalid URL`
  if (row.level === 'county' && !row.county_name) return `Row ${idx + 1}: county level requires county_name`
  if (row.level === 'city' && (!row.county_name || !row.city_name)) return `Row ${idx + 1}: city level requires county_name + city_name`
  // Duplicate URL in DB
  if (existingUrls.has(row.news_url)) return `Row ${idx + 1}: URL already exists in database (${row.news_url})`
  // Duplicate URL within file
  const dupeInFile = allRows.findIndex((r, i) => i !== idx && r.news_url === row.news_url)
  if (dupeInFile !== -1) return `Row ${idx + 1}: duplicate URL with row ${dupeInFile + 1} in this file`
  return null
}

function normalize(raw) {
  const get = (keys) =>
    (keys.map(k => raw[k] ?? raw[k.toLowerCase()] ?? raw[k.toUpperCase()]).find(v => v != null) ?? '')
  return {
    slug:        String(get(['slug', 'Slug', 'SLUG'])).trim(),
    name:        String(get(['name', 'Name', 'NAME'])).trim(),
    news_url:    String(get(['news_url', 'url', 'URL', 'News URL'])).trim(),
    level:       String(get(['level', 'Level', 'LEVEL'])).trim().toLowerCase(),
    state_code:  String(get(['state_code', 'state', 'State', 'STATE_CODE'])).trim().toUpperCase(),
    county_name: String(get(['county_name', 'county', 'County', 'COUNTY'])).trim(),
    city_name:   String(get(['city_name', 'city', 'City', 'CITY'])).trim(),
    notes:       String(get(['notes', 'Notes', 'NOTES'])).trim(),
    _status: 'pending',
  }
}

const levelColor = (l) => ({
  federal: { bg: '#1e3a5f', color: '#93c5fd' },
  state:   { bg: '#14532d', color: '#86efac' },
  county:  { bg: '#713f12', color: '#fde68a' },
  city:    { bg: '#4a1d96', color: '#c4b5fd' },
}[l] ?? { bg: '#1e293b', color: '#94a3b8' })

export default function AdminUpload() {
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [sheetNames, setSheetNames] = useState([])
  const [activeSheet, setActiveSheet] = useState('')
  const [existingSlugs, setExistingSlugs] = useState(new Set())
  const [existingUrls, setExistingUrls] = useState(new Set())
  const [allSources, setAllSources] = useState([])
  const [deleteSearch, setDeleteSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteMsg, setDeleteMsg] = useState('')
  const [tab, setTab] = useState('upload')
  const wbRef = useRef(null)

  // Load existing sources for duplicate detection + delete tab
  useEffect(() => {
    supabase.from('news_sources').select('id, slug, name, news_url, level, state_code, county_name, city_name, active')
      .order('slug')
      .then(({ data }) => {
        if (data) {
          setAllSources(data)
          setExistingSlugs(new Set(data.map(r => r.slug)))
          setExistingUrls(new Set(data.map(r => r.news_url)))
        }
      })
  }, [done])

  const parseSheet = (wb, sheetName, slugs, urls) => {
    const ws = wb.Sheets[sheetName]
    const raw = XLSX.utils.sheet_to_json(ws)
    const parsed = raw.map(normalize)
    const errs = []
    parsed.forEach((r, i) => {
      // Slugs that are already in DB are updates (ok), but duplicate URLs are errors
      const urlsExcludingUpdates = new Set([...urls].filter(u => {
        const existing = allSources.find(s => s.news_url === u)
        return !existing || existing.slug !== r.slug
      }))
      const e = validateRow(r, i, slugs, urlsExcludingUpdates, parsed)
      if (e) errs.push(e)
    })
    // Mark rows that are updates vs new
    const tagged = parsed.map(r => ({
      ...r,
      _isUpdate: slugs.has(r.slug),
    }))
    setRows(tagged)
    setErrors(errs)
    setDone(false)
  }

  const processFile = (file) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result)
      const wb = XLSX.read(data, { type: 'array' })
      wbRef.current = wb
      setSheetNames(wb.SheetNames)
      setActiveSheet(wb.SheetNames[0])
      parseSheet(wb, wb.SheetNames[0], existingSlugs, existingUrls)
    }
    reader.readAsArrayBuffer(file)
  }

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [existingSlugs, existingUrls])

  const onFileInput = (e) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const switchSheet = (name) => {
    setActiveSheet(name)
    if (wbRef.current) parseSheet(wbRef.current, name, existingSlugs, existingUrls)
  }

  const runImport = async () => {
    if (errors.length) return
    setImporting(true)
    const updated = [...rows]
    for (let i = 0; i < updated.length; i++) {
      const { _status, _message, _isUpdate, ...row } = updated[i]
      const clean = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === '' ? null : v]))
      const { error } = await supabase.from('news_sources').upsert(clean, { onConflict: 'slug' })
      updated[i] = { ...updated[i], _status: error ? 'error' : 'success', _message: error?.message }
      setRows([...updated])
    }
    setImporting(false)
    setDone(true)
  }

  const handleDelete = async (source) => {
    setDeleting(source.id)
    const { error } = await supabase.from('news_sources').delete().eq('id', source.id)
    if (error) {
      setDeleteMsg(`Failed: ${error.message}`)
    } else {
      setAllSources(prev => prev.filter(s => s.id !== source.id))
      setExistingUrls(prev => { const n = new Set(prev); n.delete(source.news_url); return n })
      setExistingSlugs(prev => { const n = new Set(prev); n.delete(source.slug); return n })
      setDeleteMsg(`Deleted: ${source.name}`)
    }
    setDeleting(null)
    setDeleteConfirm(null)
    setTimeout(() => setDeleteMsg(''), 3000)
  }

  const filteredSources = allSources.filter(s =>
    !deleteSearch || s.name.toLowerCase().includes(deleteSearch.toLowerCase()) ||
    s.slug.toLowerCase().includes(deleteSearch.toLowerCase()) ||
    s.news_url.toLowerCase().includes(deleteSearch.toLowerCase()) ||
    (s.county_name || '').toLowerCase().includes(deleteSearch.toLowerCase()) ||
    (s.city_name || '').toLowerCase().includes(deleteSearch.toLowerCase())
  )

  const successCount = rows.filter(r => r._status === 'success').length
  const errorCount = rows.filter(r => r._status === 'error').length
  const updateCount = rows.filter(r => r._isUpdate).length
  const newCount = rows.length - updateCount

  return (
    <div style={{ minHeight: '100vh', background: '#080f18', color: '#e2eaf4', fontFamily: "'DM Mono', 'Courier New', monospace" }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e2d3d', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a1520' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/admin" style={{ color: '#4a6a8a', fontSize: 12, textDecoration: 'none' }}>← admin</a>
          <span style={{ color: '#1e2d3d' }}>|</span>
          <span style={{ fontSize: 13, color: '#e2eaf4', fontWeight: 600, letterSpacing: '0.05em' }}>MANAGE NEWS SOURCES</span>
        </div>
        <span style={{ fontSize: 11, color: '#4a6a8a' }}>{allSources.length} total sources</span>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid #1e2d3d', paddingBottom: 0 }}>
          {['upload', 'manage'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: 'transparent', border: 'none',
              borderBottom: tab === t ? '2px solid #3b82f6' : '2px solid transparent',
              color: tab === t ? '#93c5fd' : '#4a6a8a',
              padding: '8px 16px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: -1,
            }}>{t === 'upload' ? '📥 Upload Excel' : '🗂 Manage Sources'}</button>
          ))}
        </div>

        {/* ── UPLOAD TAB ── */}
        {tab === 'upload' && (<>
          {/* Format guide */}
          <div style={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#4a6a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Required Columns</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { col: 'slug', req: true, desc: 'Unique ID' },
                { col: 'name', req: true, desc: 'Full name' },
                { col: 'news_url', req: true, desc: 'Crawl URL' },
                { col: 'level', req: true, desc: 'federal/state/county/city' },
                { col: 'state_code', req: false, desc: 'e.g. CA' },
                { col: 'county_name', req: false, desc: 'e.g. Los Angeles' },
                { col: 'city_name', req: false, desc: 'e.g. Pasadena' },
                { col: 'notes', req: false, desc: 'Optional' },
              ].map(({ col, req, desc }) => (
                <div key={col} style={{ background: '#0a1520', border: `1px solid ${req ? '#2a4a7a' : '#1e2d3d'}`, borderRadius: 6, padding: '5px 10px', fontSize: 11 }}>
                  <span style={{ color: req ? '#93c5fd' : '#4a6a8a', fontWeight: 600 }}>{col}</span>
                  <span style={{ color: '#4a6a8a', marginLeft: 6 }}>{desc}</span>
                  {req && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: '#4a6a8a' }}>
              Duplicate slugs = <span style={{ color: '#f59e0b' }}>update existing row</span> · 
              Duplicate URLs = <span style={{ color: '#ef4444' }}> blocked (error)</span> · 
              Multiple sheets supported
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
            onClick={() => document.getElementById('file-input')?.click()}
            style={{ border: `2px dashed ${dragOver ? '#3b82f6' : '#1e2d3d'}`, borderRadius: 10, padding: '32px 24px', textAlign: 'center', background: dragOver ? '#0d1d3a' : '#0a1520', transition: 'all 0.2s', marginBottom: 20, cursor: 'pointer' }}
          >
            <input id="file-input" type="file" accept=".xlsx,.xls,.csv" onChange={onFileInput} style={{ display: 'none' }} />
            <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
            {fileName
              ? <div style={{ fontSize: 14, color: '#93c5fd', fontWeight: 600 }}>{fileName}</div>
              : <><div style={{ fontSize: 13, color: '#4a6a8a', marginBottom: 4 }}>Drop Excel file here or click to browse</div><div style={{ fontSize: 11, color: '#2a4a6a' }}>.xlsx · .xls · .csv</div></>
            }
          </div>

          {/* Sheet tabs */}
          {sheetNames.length > 1 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {sheetNames.map(s => (
                <button key={s} onClick={() => switchSheet(s)} style={{ background: activeSheet === s ? '#1d3a5f' : 'transparent', border: `1px solid ${activeSheet === s ? '#2a4a7a' : '#1e2d3d'}`, color: activeSheet === s ? '#93c5fd' : '#4a6a8a', padding: '5px 12px', borderRadius: 5, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>{s}</button>
              ))}
            </div>
          )}

          {/* Validation errors */}
          {errors.length > 0 && (
            <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                {errors.length} error{errors.length > 1 ? 's' : ''} — fix before importing
              </div>
              {errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: '#fca5a5', marginTop: 3 }}>⚠ {e}</div>)}
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <div style={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #1e2d3d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 11, color: '#4a6a8a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {rows.length} rows · <span style={{ color: '#22c55e' }}>{newCount} new</span> · <span style={{ color: '#f59e0b' }}>{updateCount} updates</span>
                  {done && <span style={{ marginLeft: 12, color: '#22c55e' }}>✓ {successCount} imported</span>}
                  {done && errorCount > 0 && <span style={{ marginLeft: 8, color: '#ef4444' }}>✗ {errorCount} failed</span>}
                </div>
                {!done && (
                  <button onClick={runImport} disabled={importing || errors.length > 0} style={{ background: errors.length > 0 ? '#1e2d3d' : '#1d4ed8', border: 'none', color: errors.length > 0 ? '#4a6a8a' : '#fff', padding: '7px 18px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: errors.length > 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {importing ? `Importing... (${successCount}/${rows.length})` : `Import ${rows.length} Sources`}
                  </button>
                )}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e2d3d' }}>
                      {['', 'Slug', 'Name', 'Level', 'State', 'County', 'City', 'URL'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#4a6a8a', fontWeight: 400, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => {
                      const lc = levelColor(row.level)
                      const rowErr = errors.find(e => e.includes(`Row ${i + 1}:`))
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #111d29', background: rowErr ? '#1a0808' : row._status === 'success' ? '#0a1a0a' : row._status === 'error' ? '#1a0808' : 'transparent' }}>
                          <td style={{ padding: '9px 12px', width: 28 }}>
                            {row._status === 'success' && <span style={{ color: '#22c55e' }}>✓</span>}
                            {row._status === 'error' && <span style={{ color: '#ef4444' }} title={row._message}>✗</span>}
                            {row._status === 'pending' && !rowErr && (
                              <span style={{ fontSize: 9, background: row._isUpdate ? '#713f12' : '#14532d', color: row._isUpdate ? '#fde68a' : '#86efac', padding: '1px 5px', borderRadius: 3 }}>
                                {row._isUpdate ? 'UPD' : 'NEW'}
                              </span>
                            )}
                            {rowErr && <span style={{ color: '#f59e0b' }}>⚠</span>}
                          </td>
                          <td style={{ padding: '9px 12px', color: '#c8d8ea', fontWeight: 600 }}>{row.slug}</td>
                          <td style={{ padding: '9px 12px', color: '#8aabc4', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</td>
                          <td style={{ padding: '9px 12px' }}><span style={{ background: lc.bg, color: lc.color, padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{row.level}</span></td>
                          <td style={{ padding: '9px 12px', color: '#4a6a8a' }}>{row.state_code || '—'}</td>
                          <td style={{ padding: '9px 12px', color: '#4a6a8a' }}>{row.county_name || '—'}</td>
                          <td style={{ padding: '9px 12px', color: '#4a6a8a' }}>{row.city_name || '—'}</td>
                          <td style={{ padding: '9px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <a href={row.news_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 11 }}>
                              {row.news_url.replace(/https?:\/\//, '').split('/')[0]}
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {done && (
            <div style={{ background: '#0a1a0a', border: '1px solid #14532d', borderRadius: 10, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
              <div style={{ fontSize: 15, color: '#86efac', fontWeight: 600, marginBottom: 4 }}>{successCount} source{successCount !== 1 ? 's' : ''} imported</div>
              {errorCount > 0 && <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 8 }}>{errorCount} failed — check table above</div>}
              <div style={{ fontSize: 11, color: '#4a6a8a', marginBottom: 16 }}>Existing users matching county/state are auto-subscribed.</div>
              <button onClick={() => { setRows([]); setErrors([]); setFileName(''); setDone(false); setSheetNames([]) }} style={{ background: '#1d3a5f', border: '1px solid #2a4a7a', color: '#93c5fd', padding: '7px 18px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Upload another file</button>
            </div>
          )}
        </>)}

        {/* ── MANAGE TAB ── */}
        {tab === 'manage' && (
          <div>
            {deleteMsg && (
              <div style={{ background: '#0a1a0a', border: '1px solid #14532d', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#86efac' }}>{deleteMsg}</div>
            )}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
              <input
                type="text" value={deleteSearch} onChange={e => setDeleteSearch(e.target.value)}
                placeholder="Search by name, slug, URL, county, city..."
                style={{ flex: 1, background: '#0f1923', border: '1px solid #1e2d3d', color: '#e2eaf4', padding: '9px 14px', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
              />
              <span style={{ fontSize: 12, color: '#4a6a8a', whiteSpace: 'nowrap' }}>{filteredSources.length} results</span>
            </div>

            <div style={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1e2d3d' }}>
                      {['Slug', 'Name', 'Level', 'State', 'County', 'City', 'URL', 'Active', ''].map(h => (
                        <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: '#4a6a8a', fontWeight: 400, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSources.map(s => {
                      const lc = levelColor(s.level)
                      const isConfirming = deleteConfirm === s.id
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #111d29', background: isConfirming ? '#1a0808' : 'transparent', transition: 'background 0.15s' }}
                          onMouseEnter={e => { if (!isConfirming) e.currentTarget.style.background = '#0d1825' }}
                          onMouseLeave={e => { if (!isConfirming) e.currentTarget.style.background = 'transparent' }}
                        >
                          <td style={{ padding: '9px 12px', color: '#c8d8ea', fontWeight: 600 }}>{s.slug}</td>
                          <td style={{ padding: '9px 12px', color: '#8aabc4', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</td>
                          <td style={{ padding: '9px 12px' }}><span style={{ background: lc.bg, color: lc.color, padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{s.level}</span></td>
                          <td style={{ padding: '9px 12px', color: '#4a6a8a' }}>{s.state_code || '—'}</td>
                          <td style={{ padding: '9px 12px', color: '#4a6a8a', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.county_name || '—'}</td>
                          <td style={{ padding: '9px 12px', color: '#4a6a8a', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.city_name || '—'}</td>
                          <td style={{ padding: '9px 12px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <a href={s.news_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 11 }}>
                              {s.news_url.replace(/https?:\/\//, '').split('/')[0]}
                            </a>
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <span style={{ fontSize: 10, color: s.active ? '#22c55e' : '#4a6a8a' }}>{s.active ? '● Active' : '○ Off'}</span>
                          </td>
                          <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                            {!isConfirming ? (
                              <button onClick={() => setDeleteConfirm(s.id)} style={{ background: 'transparent', border: '1px solid #7f1d1d', color: '#ef4444', padding: '3px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                                Delete
                              </button>
                            ) : (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span style={{ fontSize: 11, color: '#fca5a5' }}>Sure?</span>
                                <button onClick={() => handleDelete(s)} disabled={deleting === s.id} style={{ background: '#7f1d1d', border: 'none', color: '#fff', padding: '3px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {deleting === s.id ? '...' : 'Yes, delete'}
                                </button>
                                <button onClick={() => setDeleteConfirm(null)} style={{ background: 'transparent', border: '1px solid #1e2d3d', color: '#4a6a8a', padding: '3px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
