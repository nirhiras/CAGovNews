// lib/supabase.ts
// Supabase client for the CAGovNews frontend
// Use this in all components and pages

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// TypeScript types matching our database schema
export type Release = {
  id: string
  agency_slug: string
  title: string
  summary: string | null
  published_date: string
  tag: string | null
  source_url: string
  created_at: string
}

export type Agency = {
  id: number
  slug: string
  name: string
  site_url: string
  news_url: string | null
  color_hex: string | null
  active: boolean
}

export type Profile = {
  id: string
  email: string | null
  full_name: string | null
  plan: 'free' | 'pro'
  digest_enabled: boolean
  digest_frequency: 'daily' | 'weekly'
  agency_filter: string[] | null
  tag_filter: string[] | null
}
