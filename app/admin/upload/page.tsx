'use client'

import { useState, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type SourceRow = {
  slug: string
  name: string
  news_url: string
  level: 'federal' | 'state' | 'county' | 'city'
  state_code: string
  county_name: string
  city_name: string
  notes: string
  _status?: 'pending' | 'success' | 'error' | 'duplicate'
  _message?: string
}

const REQUIRED = ['slug', 'name', 'news_url', 'level']
const LEVELS = ['federal', 'state', 'county', 'city']

function validateRow(row: SourceRow, idx: number): string | null {
  for (const f of REQUIRED) {
    if (!row[f as keyof SourceRow]) return `Row ${idx + 1}: missing "${f}"`
  }
  if (!LEVELS.includes(row.level)) return `Row ${idx + 1}: level must be federal/state/county/city`
  if (!row.news_url.startsWith('http')) return `Row ${idx + 1}: invalid URL`
  if (row.level === 'county' && !row.county_name) return `Row ${idx + 1}: county level requires county_name`
  if (row.level === 'city' && (!row.county_name || !row.city_name)) return `Row ${idx + 1}: city level requires county_name + city_name`
  return null
}

function normalize(raw: Record<string, unknown>): SourceRow {
  const get = (keys: string[]) =>
    (keys.map(k => raw[k] ?? raw[k.toLowerCase()] ?? raw[k.toUpperCase()]).find(v => v != null) ?? '') as string
  return {
    slug:        String(get(['slug', 'Slug', 'SLUG'])).trim(),
    name:        String(get(['name', 'Name', 'NAME'])).trim(),
    news_url:    String(get(['news_url', 'url', 'URL', 'News URL'])).trim(),
    level:       String(get(['level', 'Level', 'LEVEL'])).trim().toLowerCase() as SourceRow['level'],
    state_code:  String(get(['state_code', 'state', 'State', 'STATE_CODE'])).trim().toUpperCase(),
    county_name: String(get(['county_name', 'county', 'County', 'COUNTY'])).trim(),
    city_name:   String(get(['city_name', 'city', 'City', 'CITY'])).trim(),
    notes:       String(get(['notes', 'Notes', 'NOTES'])).trim(),
    _status: 'pending',
  }
}

export default function AdminUpload() {
  const [rows, setRows] = useState<SourceRow[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState('')
  const wbRef = useRef<XLSX.WorkBook | null>(null)

  const parseSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName]
    const raw = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]
    const parsed = raw.map(normalize)
    const errs: string[] = []
    parsed.forEach((r, i) => {
      const e = validateRow(r, i)
      if (e) errs.push(e)
    })
    setRows(parsed)
    setErrors(errs)
    setDone(false)
  }

  const processFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      wbRef.current = wb
      setSheetNames(wb.SheetNames)
      setActiveSheet(wb.SheetNames[0])
      parseSheet(wb, wb.SheetNames[0])
    }
    reader.readAsArrayBuffer(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const switchSheet = (name: string) => {
    setActiveSheet(name)
    if (wbRef.current) parseSheet(wbRef.current, name)
  }

  const runImport = async () => {
    if (errors.length) return
    setImporting(true)
    const updated = [...rows]

    for (let i = 0; i < updated.length; i++) {
      const { _status, _message, ...row } = updated[i]
      // blank strings → null
      const clean = Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k, v === '' ? null : v])
      )
      const { error } = await supabase
        .from('news_sources')
        .upsert(clean, { onConflict: 'slug' })

      updated[i] = {
        ...updated[i],
        _status: error ? 'error' : 'success',
        _message: error?.message,
      }
      setRows([...updated])
    }

    setImporting(false)
    setDone(true)
  }

  const successCount = rows.filter(r => r._status === 'success').length
  const errorCount = rows.filter(r => r._status === 'error').length
  const validRows = rows.filter(r => !errors.some(e => e.includes(`Row ${rows.indexOf(r) + 1}`)))

  const levelColor = (l: string) => ({
    federal: { bg: '#1e3a5f', color: '#93c5fd' },
    state:   { bg: '#14532d', color: '#86efac' },
    county:  { bg: '#713f12', color: '#fde68a' },
    city:    { bg: '#4a1d96', color: '#c4b5fd' },
  }[l] ?? { bg: '#1e293b', color: '#94a3b8' })

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080f18',
      color: '#e2eaf4',
      fontFamily: "'DM Mono', 'Courier New', monospace",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #1e2d3d', padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0a1520',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/admin" style={{ color: '#4a6a8a', fontSize: 12, textDecoration: 'none' }}>← admin</a>
          <span style={{ color: '#1e2d3d' }}>|</span>
          <span style={{ fontSize: 13, color: '#e2eaf4', fontWeight: 600, letterSpacing: '0.05em' }}>
            IMPORT NEWS SOURCES
          </span>
        </div>
        <a href="/admin" style={{ color: '#4a6a8a', fontSize: 11, textDecoration: 'none' }}>
          View all sources →
        </a>
      </div>

      <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Instructions */}
        <div style={{
          background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 10,
          padding: 24, marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, color: '#4a6a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Excel Format — Required Columns
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { col: 'slug', desc: 'Unique ID', required: true },
              { col: 'name', desc: 'Full name', required: true },
              { col: 'news_url', desc: 'Crawl URL', required: true },
              { col: 'level', desc: 'federal/state/county/city', required: true },
              { col: 'state_code', desc: 'e.g. CA', required: false },
              { col: 'county_name', desc: 'e.g. Los Angeles', required: false },
              { col: 'city_name', desc: 'e.g. Pasadena', required: false },
              { col: 'notes', desc: 'Optional', required: false },
            ].map(({ col, desc, required }) => (
              <div key={col} style={{
                background: '#0a1520', border: `1px solid ${required ? '#2a4a7a' : '#1e2d3d'}`,
                borderRadius: 6, padding: '6px 10px', fontSize: 11,
              }}>
                <span style={{ color: required ? '#93c5fd' : '#4a6a8a', fontWeight: 600 }}>{col}</span>
                <span style={{ color: '#4a6a8a', marginLeft: 6 }}>{desc}</span>
                {required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: '#4a6a8a' }}>
            Multiple sheets supported — switch between them after upload. Existing slugs will be updated (upsert).
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          style={{
            border: `2px dashed ${dragOver ? '#3b82f6' : '#1e2d3d'}`,
            borderRadius: 10, padding: '40px 24px', textAlign: 'center',
            background: dragOver ? '#0d1d3a' : '#0a1520',
            transition: 'all 0.2s', marginBottom: 24, cursor: 'pointer',
          }}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input id="file-input" type="file" accept=".xlsx,.xls,.csv" onChange={onFileInput} style={{ display: 'none' }} />
          <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
          {fileName ? (
            <div style={{ fontSize: 14, color: '#93c5fd', fontWeight: 600 }}>{fileName}</div>
          ) : (
            <>
              <div style={{ fontSize: 14, color: '#4a6a8a', marginBottom: 4 }}>Drop Excel file here or click to browse</div>
              <div style={{ fontSize: 11, color: '#2a4a6a' }}>.xlsx · .xls · .csv</div>
            </>
          )}
        </div>

        {/* Sheet tabs */}
        {sheetNames.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {sheetNames.map(s => (
              <button key={s} onClick={() => switchSheet(s)} style={{
                background: activeSheet === s ? '#1d3a5f' : 'transparent',
                border: `1px solid ${activeSheet === s ? '#2a4a7a' : '#1e2d3d'}`,
                color: activeSheet === s ? '#93c5fd' : '#4a6a8a',
                padding: '6px 14px', borderRadius: 6, fontSize: 12,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>{s}</button>
            ))}
          </div>
        )}

        {/* Validation errors */}
        {errors.length > 0 && (
          <div style={{
            background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8,
            padding: 16, marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              {errors.length} Validation Error{errors.length > 1 ? 's' : ''} — Fix before importing
            </div>
            {errors.map((e, i) => (
              <div key={i} style={{ fontSize: 12, color: '#fca5a5', marginTop: 4 }}>⚠ {e}</div>
            ))}
          </div>
        )}

        {/* Preview table */}
        {rows.length > 0 && (
          <div style={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid #1e2d3d',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 11, color: '#4a6a8a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Preview — {rows.length} rows
                {done && <span style={{ marginLeft: 12, color: '#22c55e' }}>✓ {successCount} imported</span>}
                {done && errorCount > 0 && <span style={{ marginLeft: 8, color: '#ef4444' }}>✗ {errorCount} failed</span>}
              </div>
              {!done && (
                <button
                  onClick={runImport}
                  disabled={importing || errors.length > 0}
                  style={{
                    background: errors.length > 0 ? '#1e2d3d' : importing ? '#1d3a5f' : '#1d4ed8',
                    border: 'none', color: errors.length > 0 ? '#4a6a8a' : '#fff',
                    padding: '8px 20px', borderRadius: 6, fontSize: 13,
                    fontWeight: 600, cursor: errors.length > 0 ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {importing ? `Importing... (${successCount}/${rows.length})` : `Import ${rows.length} Sources`}
                </button>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e2d3d' }}>
                    {['', 'Slug', 'Name', 'Level', 'State', 'County', 'City', 'URL'].map(h => (
                      <th key={h} style={{
                        padding: '8px 14px', textAlign: 'left',
                        color: '#4a6a8a', fontWeight: 400, fontSize: 10,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const lc = levelColor(row.level)
                    const rowError = errors.find(e => e.includes(`Row ${i + 1}:`))
                    return (
                      <tr key={i}
                        style={{
                          borderBottom: '1px solid #111d29',
                          background: rowError ? '#1a0808' : row._status === 'success' ? '#0a1a0a' : row._status === 'error' ? '#1a0808' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '10px 14px', width: 24 }}>
                          {row._status === 'success' && <span style={{ color: '#22c55e' }}>✓</span>}
                          {row._status === 'error' && <span style={{ color: '#ef4444' }} title={row._message}>✗</span>}
                          {row._status === 'pending' && !rowError && <span style={{ color: '#4a6a8a' }}>·</span>}
                          {rowError && <span style={{ color: '#f59e0b' }}>⚠</span>}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#c8d8ea', fontWeight: 600 }}>{row.slug}</td>
                        <td style={{ padding: '10px 14px', color: '#8aabc4', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            background: lc.bg, color: lc.color,
                            padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                          }}>{row.level}</span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#4a6a8a' }}>{row.state_code || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#4a6a8a' }}>{row.county_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#4a6a8a' }}>{row.city_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#2a4a7a', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <a href={row.news_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
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

        {/* Done state */}
        {done && (
          <div style={{
            background: '#0a1a0a', border: '1px solid #14532d', borderRadius: 10,
            padding: 24, textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 16, color: '#86efac', fontWeight: 600, marginBottom: 4 }}>
              {successCount} source{successCount !== 1 ? 's' : ''} imported successfully
            </div>
            {errorCount > 0 && (
              <div style={{ fontSize: 13, color: '#fca5a5', marginBottom: 8 }}>
                {errorCount} row{errorCount !== 1 ? 's' : ''} failed — check the table above
              </div>
            )}
            <div style={{ fontSize: 12, color: '#4a6a8a', marginBottom: 20 }}>
              New sources are now live in the crawler. Existing users matching the county/state will be auto-subscribed.
            </div>
            <button
              onClick={() => { setRows([]); setErrors([]); setFileName(''); setDone(false); setSheetNames([]); }}
              style={{
                background: '#1d3a5f', border: '1px solid #2a4a7a', color: '#93c5fd',
                padding: '8px 20px', borderRadius: 6, fontSize: 12,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >Upload another file</button>
          </div>
        )}
      </div>
    </div>
  )
}
