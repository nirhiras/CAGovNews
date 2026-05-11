// lib/hooks.ts
// React hooks for fetching data from Supabase
// Import these in your v0 components

'use client'

import { useState, useEffect } from 'react'
import { supabase, type Release, type Agency } from './supabase'

// ── Fetch all releases with optional filters ─────────────────
export function useReleases(options?: {
  agency?: string
  tag?: string
  search?: string
  limit?: number
}) {
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReleases() {
      setLoading(true)
      try {
        let query = supabase
          .from('releases')
          .select('*')
          .order('published_date', { ascending: false })
          .limit(options?.limit ?? 100)

        if (options?.agency && options.agency !== 'All') {
          query = query.eq('agency_slug', options.agency)
        }

        if (options?.tag && options.tag !== 'All') {
          query = query.eq('tag', options.tag)
        }

        if (options?.search) {
          query = query.or(
            `title.ilike.%${options.search}%,summary.ilike.%${options.search}%`
          )
        }

        const { data, error } = await query

        if (error) throw error
        setReleases(data ?? [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchReleases()
  }, [options?.agency, options?.tag, options?.search, options?.limit])

  return { releases, loading, error }
}

// ── Fetch all agencies ────────────────────────────────────────
export function useAgencies() {
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAgencies() {
      const { data } = await supabase
        .from('agencies')
        .select('*')
        .eq('active', true)
        .order('slug')

      setAgencies(data ?? [])
      setLoading(false)
    }

    fetchAgencies()
  }, [])

  return { agencies, loading }
}

// ── Fetch single release with full content ───────────────────
export function useRelease(id: string) {
  const [release, setRelease] = useState<Release | null>(null)
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRelease() {
      const { data } = await supabase
        .from('releases')
        .select('*, release_content(extracted_markdown, extracted_text)')
        .eq('id', id)
        .single()

      if (data) {
        const { release_content, ...releaseData } = data as any
        setRelease(releaseData)
        setContent(release_content?.extracted_markdown ?? null)
      }
      setLoading(false)
    }

    if (id) fetchRelease()
  }, [id])

  return { release, content, loading }
}

// ── Fetch latest N releases for homepage ─────────────────────
export function useLatestReleases(limit = 10) {
  return useReleases({ limit })
}

// ── Get all unique tags from releases ────────────────────────
export function useTags() {
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    async function fetchTags() {
      const { data } = await supabase
        .from('releases')
        .select('tag')
        .not('tag', 'is', null)

      const uniqueTags = [...new Set((data ?? []).map((r: any) => r.tag))].sort()
      setTags(uniqueTags)
    }

    fetchTags()
  }, [])

  return tags
}

// ── Get crawl log (last run stats) ───────────────────────────
export function useLastCrawl() {
  const [lastCrawl, setLastCrawl] = useState<any>(null)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('crawl_log')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .single()

      setLastCrawl(data)
    }
    fetch()
  }, [])

  return lastCrawl
}
