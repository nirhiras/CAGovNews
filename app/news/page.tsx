'use client'

// app/news/page.tsx
// Main news feed — pulls live data from Supabase
// Replace your current static news list with this component

import { useState } from 'react'
import { useReleases, useAgencies, useTags } from '@/lib/hooks'

const AGENCY_COLORS: Record<string, string> = {
  'Governor':      '#003366',
  'CDPH':          '#117a65',
  'DOJ / AG':      '#1a5276',
  'Caltrans':      '#1f618d',
  'OTS':           '#7d6608',
  'CDT':           '#1a5276',
  'DGS':           '#2874a6',
  'DOF':           '#1a5276',
  'Insurance':     '#6e2f1e',
  'DMHC':          '#1a5276',
  'CalHFA':        '#1a5276',
  'Water Board':   '#1a5276',
  'CalRecycle':    '#1a5276',
  'CARB':          '#1a5276',
  'EDD':           '#1a5276',
  'CDE':           '#1a5276',
  'DHCS':          '#1a5276',
  'Controller':    '#1a5276',
  'Treasurer':     '#1a5276',
  'Sec. of State': '#1a5276',
  'CalPERS':       '#1a5276',
  'FTB':           '#1a5276',
  'CEC':           '#0e6655',
  'HCD':           '#1a5276',
  'Cal OES':       '#922b21',
  'OTSI':          '#005f73',
  'CPUC':          '#1a6b5a',
  'DFPI':          '#2c3e6b',
  'CalPrivacy':    '#4a235a',
  'FPPC':          '#6e2c00',
  'DTSC':          '#7d3c3c',
  'CSAC':          '#1a5276',
  'CDFA':          '#1e6b2a',
  'DPR':           '#5d6d1e',
  'DMV':           '#21618c',
  'ABC':           '#7b241c',
  'CDA':           '#1a6b5a',
  'CRD':           '#6c3483',
  'CalHR':         '#2e4057',
  'DCC':           '#145a32',
  'OEHHA':         '#4d6a1b',
  'Energy Safety': '#935116',
  'Parks':         '#1d6533',
}

function getAgencyColor(slug: string): string {
  return AGENCY_COLORS[slug] ?? '#1a5276'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function NewsPage() {
  const [selectedAgency, setSelectedAgency] = useState('All')
  const [selectedTag, setSelectedTag] = useState('All')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { releases, loading, error } = useReleases({
    agency: selectedAgency,
    tag: selectedTag,
    search,
  })

  const { agencies } = useAgencies()
  const tags = useTags()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Header */}
      <div className="bg-[#1e3a5f] text-white px-6 py-10 text-center">
        <p className="text-blue-300 text-sm uppercase tracking-widest mb-2">Official News</p>
        <h1 className="text-4xl font-serif font-bold mb-3">California Government News</h1>
        <p className="text-blue-100 max-w-xl mx-auto">
          Official press releases and announcements from California state agencies
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search releases..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-800 transition"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput('') }}
              className="text-gray-500 text-sm underline"
            >
              Clear
            </button>
          )}
        </form>

        {/* Agency filter */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedAgency('All')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              selectedAgency === 'All'
                ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            All Agencies
          </button>
          {agencies.map(a => (
            <button
              key={a.slug}
              onClick={() => setSelectedAgency(a.slug === selectedAgency ? 'All' : a.slug)}
              style={selectedAgency === a.slug ? { backgroundColor: getAgencyColor(a.slug), borderColor: getAgencyColor(a.slug) } : {}}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                selectedAgency === a.slug
                  ? 'text-white'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
              }`}
            >
              {a.slug}
            </button>
          ))}
        </div>

        {/* Tag filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag('All')}
            className={`px-3 py-1 rounded-full text-xs border transition ${
              selectedTag === 'All' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            All Topics
          </button>
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? 'All' : tag)}
              className={`px-3 py-1 rounded-full text-xs border transition ${
                selectedTag === tag
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-4">
          {loading ? 'Loading...' : `${releases.length} release${releases.length !== 1 ? 's' : ''}`}
          {selectedAgency !== 'All' && ` · ${selectedAgency}`}
          {selectedTag !== 'All' && ` · ${selectedTag}`}
          {search && ` · "${search}"`}
        </p>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-4">
            Error loading releases: {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* News cards */}
        {!loading && (
          <div className="space-y-4">
            {releases.map(release => (
              <a
                key={release.id}
                href={release.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-xl p-5 border border-gray-100 hover:border-blue-200 hover:shadow-md transition group"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className="text-white text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: getAgencyColor(release.agency_slug) }}
                  >
                    {release.agency_slug}
                  </span>
                  {release.tag && (
                    <span className="text-gray-500 text-xs border border-gray-200 px-2 py-0.5 rounded-full">
                      {release.tag}
                    </span>
                  )}
                  <span className="text-gray-400 text-xs ml-auto">
                    {formatDate(release.published_date)}
                  </span>
                </div>

                <h3 className="text-gray-900 font-semibold leading-snug mb-2 group-hover:text-blue-800 transition">
                  {release.title}
                </h3>

                {release.summary && (
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">
                    {release.summary}
                  </p>
                )}

                <div className="mt-3 text-blue-600 text-xs font-medium group-hover:text-blue-800">
                  Read full release →
                </div>
              </a>
            ))}

            {releases.length === 0 && !loading && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg mb-1">No releases found</p>
                <p className="text-sm">Try adjusting your filters or search terms</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
