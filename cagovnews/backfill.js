/**
 * backfill.js — Archive content + fix published dates
 *
 * node backfill.js                    — archive missing content
 * FORCE=true node backfill.js         — re-scrape all (even existing)
 * DATES_ONLY=true node backfill.js    — re-extract dates from archived HTML (fast, no HTTP)
 * AGENCY_FILTER=DMV node backfill.js  — single agency
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const AGENCY_FILTER = process.env.AGENCY_FILTER || null;
const FORCE         = process.env.FORCE === 'true';
const DATES_ONLY    = process.env.DATES_ONLY === 'true';

const delay  = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (text) => crypto.createHash('sha256').update(text ?? '').digest('hex');

function parseDate(str) {
  if (!str) return null;
  try {
    const cleaned = str.trim()
      .replace(/^Published:?\s*/i, '')
      .replace(/^Date:?\s*/i, '')
      .replace(/^Posted:?\s*/i, '');
    const d = new Date(cleaned);
    if (isNaN(d)) return null;
    const y = d.getFullYear();
    if (y < 2020 || y > 2030) return null;
    // Reject future dates — article body often contains upcoming event dates
    if (d > new Date()) return null;
    return d.toISOString().split('T')[0];
  } catch { return null; }
}

function extractDateFromUrl(url) {
  const m = url.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);
  if (m) return parseDate(`${m[1]}-${m[2]}-${m[3]}`);
  const m2 = url.match(/\/(20\d{2})\/(\d{2})\//);
  if (m2) return parseDate(`${m2[1]}-${m2[2]}-01`);
  return null;
}

function extractPublishDate($, bodyText, sourceUrl = '') {
  // Meta tags
  for (const val of [
    $('meta[property="article:published_time"]').attr('content'),
    $('meta[name="article:published_time"]').attr('content'),
    $('meta[name="date"]').attr('content'),
    $('meta[name="publishdate"]').attr('content'),
    $('meta[name="DC.date"]').attr('content'),
    $('meta[itemprop="datePublished"]').attr('content'),
    $('[itemprop="datePublished"]').attr('content') || $('[itemprop="datePublished"]').text(),
  ]) { const p = parseDate(val); if (p) return p; }

  // <time datetime>
  const t = $('time[datetime]').first().attr('datetime');
  if (t) { const p = parseDate(t); if (p) return p; }

  // JSON-LD
  let jd = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (jd) return;
    try {
      const json = JSON.parse($(el).html() || '{}');
      for (const k of ['datePublished','dateCreated','dateModified']) {
        const p = parseDate(json[k]); if (p) { jd = p; return; }
      }
    } catch {}
  });
  if (jd) return jd;

  // CSS selectors
  for (const sel of ['.date','.publish-date','.published-date','.post-date','.entry-date',
    '.article-date','.release-date','.dateline','.timestamp','.byline']) {
    const t2 = $(sel).first().text().trim();
    if (t2 && t2.length < 80) { const p = parseDate(t2); if (p) return p; }
  }

  // FOR IMMEDIATE RELEASE
  const ir = bodyText.match(/FOR\s+IMMEDIATE\s+RELEASE[:\s]*[\r\n]+\s*([A-Z][a-z]+ \d{1,2},\s*20\d{2})/i);
  if (ir) { const p = parseDate(ir[1]); if (p) return p; }

  // SACRAMENTO dateline
  const sac = bodyText.match(/SACRAMENTO\s*[–\-—,]\s*([A-Z][a-z]+ \d{1,2},?\s*20\d{2})/i);
  if (sac) { const p = parseDate(sac[1]); if (p) return p; }

  // URL date
  const ud = extractDateFromUrl(sourceUrl); if (ud) return ud;

  // Generic text patterns
  for (const pat of [
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*20\d{2}\b/i,
    /\b20\d{2}-\d{2}-\d{2}\b/,
  ]) { const m = bodyText.match(pat); if (m) { const p = parseDate(m[0]); if (p) return p; } }

  return null;
}

// ── Mode 1: Re-extract dates from already-archived HTML ───────
async function fixDatesOnly() {
  console.log('\n📅 Re-extracting dates from archived HTML (no HTTP requests)...\n');

  let q = supabase
    .from('releases')
    .select('id, agency_slug, source_url, published_date, release_content(raw_html, extracted_text)')
    .order('agency_slug');
  if (AGENCY_FILTER) q = q.eq('agency_slug', AGENCY_FILTER);

  const { data: releases, error } = await q;
  if (error) { console.error('Failed:', error); process.exit(1); }

  console.log(`Found ${releases.length} releases to process\n`);

  let updated = 0, unchanged = 0, noContent = 0;

  for (const release of releases) {
    const content = release.release_content;
    if (!content?.raw_html && !content?.extracted_text) { noContent++; continue; }

    let newDate = extractDateFromUrl(release.source_url);

    if (!newDate && content.raw_html) {
      const $ = cheerio.load(content.raw_html);
      newDate = extractPublishDate($, $('body').text(), release.source_url);
    }

    if (!newDate && content.extracted_text) {
      for (const pat of [
        /FOR\s+IMMEDIATE\s+RELEASE[:\s]*[\r\n\s]+([A-Z][a-z]+ \d{1,2},\s*20\d{2})/i,
        /SACRAMENTO\s*[–\-—,]\s*([A-Z][a-z]+ \d{1,2},?\s*20\d{2})/i,
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*20\d{2}\b/i,
      ]) {
        const m = content.extracted_text.match(pat);
        if (m) { newDate = parseDate(m[1] || m[0]); if (newDate) break; }
      }
    }

    if (newDate && newDate !== release.published_date) {
      await supabase.from('releases').update({ published_date: newDate }).eq('id', release.id);
      console.log(`  ✓ ${release.agency_slug.padEnd(16)} ${release.published_date} → ${newDate}`);
      updated++;
    } else {
      unchanged++;
    }
  }

  console.log(`\n✅ ${updated} dates updated | ${unchanged} unchanged | ${noContent} no archived content`);
}

// ── Mode 2: Scrape missing or all content ─────────────────────
async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CAGovNews-Crawler/1.0 (cagovnews.com)' },
      timeout: 15000,
    });
    return { html: await res.text(), status: res.status, ok: res.ok };
  } catch { return { html: null, status: 0, ok: false }; }
}

async function backfill() {
  console.log('\n📦 CAGovNews backfill started:', new Date().toISOString());
  if (FORCE) console.log('   FORCE mode — re-scraping all');

  let q = supabase.from('releases').select('id, agency_slug, source_url, title').order('published_date', { ascending: false });
  if (AGENCY_FILTER) q = q.eq('agency_slug', AGENCY_FILTER);

  const { data: releases, error } = await q;
  if (error) { console.error('Failed:', error); process.exit(1); }

  let toProcess = releases;
  if (!FORCE) {
    const { data: existing } = await supabase.from('release_content').select('release_id');
    const existingIds = new Set((existing || []).map(r => r.release_id));
    toProcess = releases.filter(r => !existingIds.has(r.id));
  }

  console.log(`  Total: ${releases.length} | To process: ${toProcess.length}\n`);
  let success = 0, failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const release = toProcess[i];
    process.stdout.write(`  [${i+1}/${toProcess.length}] ${release.agency_slug}: ${release.title.slice(0,50)}... `);

    const { html, status, ok } = await fetchPage(release.source_url);

    if (!ok || !html) {
      console.log(`✗ (HTTP ${status})`);
      await supabase.from('release_content').upsert({
        release_id: release.id, scrape_status: 'failed', http_status: status,
        scraped_at: new Date().toISOString(), source_still_live: status !== 404 && status !== 410,
      });
      failed++;
    } else {
      const $ = cheerio.load(html);
      $('nav,footer,script,style,iframe,.sidebar,.nav,.footer,#nav,#footer').remove();
      const mainHtml = $('article').first().html() || $('main').first().html() || $('body').html();
      const $m = cheerio.load(mainHtml || html);
      const extractedText = $m.text().replace(/\s+/g, ' ').trim();
      let markdown = '';
      $m('h1,h2,h3,h4,p,li,blockquote').each((_, el) => {
        const tag = el.tagName.toLowerCase();
        const text = $m(el).text().trim(); if (!text) return;
        const pre = {h1:'# ',h2:'## ',h3:'### ',h4:'#### ',li:'- ',blockquote:'> '};
        markdown += (pre[tag]||'') + text + '\n\n';
      });
      const publishedDate = extractPublishDate($, $('body').text(), release.source_url);

      await supabase.from('release_content').upsert({
        release_id: release.id, raw_html: html, extracted_text: extractedText,
        extracted_markdown: markdown, scraped_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(), scrape_status: 'ok',
        http_status: status, content_hash: sha256(extractedText), source_still_live: true,
      });
      if (publishedDate) {
        await supabase.from('releases').update({ published_date: publishedDate }).eq('id', release.id);
      }
      console.log(`✓${publishedDate ? ` (${publishedDate})` : ''}`);
      success++;
    }
    await delay(1000);
  }
  console.log(`\n✅ Done: ${success} archived, ${failed} failed`);
}

DATES_ONLY
  ? fixDatesOnly().catch(err => { console.error('Fatal:', err); process.exit(1); })
  : backfill().catch(err => { console.error('Fatal:', err); process.exit(1); });
