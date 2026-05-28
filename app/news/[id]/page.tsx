// app/news/[id]/page.tsx
// @ts-nocheck
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const AGENCY_COLORS: Record<string, string> = {
  'Governor': '#003366', 'CDPH': '#117a65', 'DOJ / AG': '#1a5276',
  'Caltrans': '#1f618d', 'OTS': '#7d6608', 'CDT': '#1a5276',
  'DGS': '#2874a6', 'DOF': '#1a5276', 'Insurance': '#6e2f1e',
  'Water Board': '#1a5276', 'CalRecycle': '#1a5276', 'CARB': '#1a5276',
  'EDD': '#1a5276', 'CDE': '#1a5276', 'DHCS': '#1a5276',
  'Controller': '#1a5276', 'Treasurer': '#1a5276', 'CalPERS': '#1a5276',
  'FTB': '#1a5276', 'CEC': '#0e6655', 'HCD': '#1a5276',
  'Cal OES': '#922b21', 'CPUC': '#1a6b5a', 'DFPI': '#2c3e6b',
  'CalPrivacy': '#4a235a', 'FPPC': '#6e2c00', 'DTSC': '#7d3c3c',
  'CSAC': '#1a5276', 'CDFA': '#1e6b2a', 'DPR': '#5d6d1e',
  'DMV': '#21618c', 'ABC': '#7b241c', 'CDA': '#1a6b5a',
  'CRD': '#6c3483', 'CalHR': '#2e4057', 'DCC': '#145a32',
  'OEHHA': '#4d6a1b', 'Energy Safety': '#935116', 'Parks': '#1d6533',
  'CalVet': '#922b21', 'CDCR': '#7b1d1d',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function cleanSummary(text: string) {
  if (!text) return ''
  return text
    .replace(/^Skip to content\s*https?:\/\/\S+\s*/i, '')
    .replace(/^main-content\s*News\s*https?:\/\/\S+\s*/i, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { data: release } = await supabase
    .from('releases')
    .select('title, summary, agency_slug, published_date')
    .eq('id', params.id)
    .single()

  if (!release) return { title: 'Article not found — CAGovNews' }

  const summary = cleanSummary(release.summary)
  return {
    title: `${release.title} — CAGovNews`,
    description: summary?.slice(0, 160) || `${release.agency_slug} press release from ${formatDate(release.published_date)}`,
    openGraph: {
      title: release.title,
      description: summary?.slice(0, 160),
      url: `https://cagovnews.com/news/${params.id}`,
      siteName: 'CAGovNews',
      type: 'article',
      publishedTime: release.published_date,
    },
    twitter: {
      card: 'summary_large_image',
      title: release.title,
      description: summary?.slice(0, 160),
    },
  }
}

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const { data: release } = await supabase
    .from('releases')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!release) notFound()

  const { data: content } = await supabase
    .from('release_content')
    .select('raw_html, extracted_text, scrape_status')
    .eq('release_id', params.id)
    .single()

  const agencyColor = AGENCY_COLORS[release.agency_slug] ?? '#1b3a6b'
  const summary = cleanSummary(release.summary)
  const articleUrl = `https://cagovnews.com/news/${params.id}`
  const sourceHost = release.source_url.replace(/https?:\/\//, '').split('/')[0]

  let bodyHtml = ''
  if (content?.scrape_status === 'ok' && content.raw_html?.trim().length > 200) {
    bodyHtml = content.raw_html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/\s(class|id|style|onclick|onload)="[^"]*"/gi, '')
      .replace(/\s(class|id|style|onclick|onload)='[^']*'/gi, '')
      .trim()
  }

  const eTitle = encodeURIComponent(release.title)
  const eUrl   = encodeURIComponent(articleUrl)
  const xShare = `https://twitter.com/intent/tweet?text=${eTitle}&url=${eUrl}`
  const liShare = `https://www.linkedin.com/sharing/share-offsite/?url=${eUrl}`
  const mailShare = `mailto:?subject=CAGovNews%3A%20${eTitle}&body=Read%20this%20article%20on%20CAGovNews%3A%20${eUrl}`

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1b3a6b', borderBottom: '3px solid #f5a623' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '54px' }}>
          <a href="/news" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: '32px', height: '32px', background: '#fff', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#1b3a6b' }}>CA</div>
            <div>
              <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>CA Gov News</div>
              <div style={{ color: '#93c5fd', fontSize: '9px' }}>California Government News</div>
            </div>
          </a>
          <a href="/news" style={{ color: '#93c5fd', fontSize: '12px', textDecoration: 'none' }}>← All releases</a>
        </div>
      </div>

      {/* Article */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #d1d9e6', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '28px 32px' }}>

            {/* Breadcrumb */}
            <div style={{ fontSize: 12, color: '#9aa5b4', marginBottom: 16 }}>
              <a href="/news" style={{ color: '#1b3a6b', textDecoration: 'none', fontWeight: 500 }}>CAGovNews</a>
              <span style={{ margin: '0 6px' }}>›</span>
              <span>{release.agency_slug}</span>
            </div>

            {/* Action bar */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingBottom: 16, marginBottom: 20, borderBottom: '0.5px solid #e5e7eb' }}>
              <a href={mailShare} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: '1px solid #dde3ec', background: '#f8fafc', color: '#444', textDecoration: 'none', whiteSpace: 'nowrap' }}>📧 Email</a>
              <a href={xShare} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: '1px solid #dde3ec', background: '#f8fafc', color: '#444', textDecoration: 'none', whiteSpace: 'nowrap' }}>𝕏 Post on X</a>
              <a href={liShare} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: '1px solid #dde3ec', background: '#f8fafc', color: '#444', textDecoration: 'none', whiteSpace: 'nowrap' }}>in LinkedIn</a>
              <a href={release.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', fontSize: 12, fontWeight: 500, borderRadius: 6, border: '1px solid #dde3ec', background: '#f8fafc', color: '#444', textDecoration: 'none', whiteSpace: 'nowrap' }}>🔗 Source</a>
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span style={{ background: agencyColor, color: '#fff', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>{release.agency_slug}</span>
              {release.tag && <span style={{ background: '#f1f5f9', color: '#334155', fontSize: '11px', padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{release.tag}</span>}
            </div>
            <div style={{ fontSize: '11px', color: '#9aa5b4', marginBottom: '12px' }}>{formatDate(release.published_date)}</div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1b3a6b', lineHeight: 1.3, marginBottom: '16px', margin: '0 0 16px' }}>{release.title}</h1>

            {summary && (
              <p style={{ fontSize: '16px', color: '#374151', lineHeight: 1.75, marginBottom: '24px', borderLeft: `3px solid ${agencyColor}`, paddingLeft: '16px' }}>{summary}</p>
            )}

            {/* Body */}
            {bodyHtml
              ? <div className="article-content" style={{ fontSize: '16px', color: '#1a1a1a', lineHeight: 1.85, fontFamily: "'Source Serif 4', Georgia, serif" }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
              : content?.extracted_text
              ? <div style={{ fontSize: '16px', color: '#1a1a1a', lineHeight: 1.85, fontFamily: "'Source Serif 4', Georgia, serif" }}>
                  {(content.extracted_text.trim().match(/[^.!?]+[.!?]+["']?\s*/g) || [content.extracted_text])
                    .reduce((acc: string[][], s: string, i: number) => {
                      const g = Math.floor(i / 4)
                      if (!acc[g]) acc[g] = []
                      acc[g].push(s)
                      return acc
                    }, [])
                    .map((group: string[], i: number) => <p key={i} style={{ marginBottom: 18 }}>{group.join('')}</p>)
                  }
                </div>
              : <div style={{ background: '#fffbeb', border: '0.5px solid #fde68a', borderRadius: '6px', padding: '14px 18px', fontSize: '14px', color: '#92400e' }}>
                  Full article content will be available after the next crawler run.
                </div>
            }

            {/* View original */}
            <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <a href={release.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1b3a6b', color: '#fff', padding: '10px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>
                View original on {sourceHost} ↗
              </a>
              <a href="/news" style={{ fontSize: 13, color: '#1b3a6b', textDecoration: 'none', fontWeight: 500 }}>← Back to all releases</a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#1b3a6b', borderTop: '3px solid #f5a623', padding: '16px', marginTop: '40px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: '#93c5fd', fontSize: '11px' }}>© 2026 CAGovNews.com · All content sourced from official California .gov websites · Not affiliated with the State of California</span>
          <a href="/privacy" style={{ color: '#93c5fd', fontSize: '11px', textDecoration: 'none' }}>Privacy Policy</a>
        </div>
      </div>
    </div>
  )
}
