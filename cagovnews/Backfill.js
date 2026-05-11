/**
 * backfill.js — Archive content for all existing releases that have no content yet
 * 
 * Run once: node backfill.js
 * Or for a single agency: AGENCY_FILTER=DMV node backfill.js
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
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (text) => crypto.createHash('sha256').update(text ?? '').digest('hex');

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CAGovNews-Crawler/1.0 (cagovnews.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
    });
    const html = await res.text();
    return { html, status: res.status, ok: res.ok };
  } catch (err) {
    return { html: null, status: 0, ok: false };
  }
}

function extractContent(html) {
  const $ = cheerio.load(html);
  $('nav,footer,script,style,iframe,.sidebar,.nav,.footer,.menu,#nav,#footer,#header').remove();

  const mainHtml =
    $('article').first().html() ||
    $('main').first().html() ||
    $('.press-release,.news-release,.content-area,#main-content,.page-content').first().html() ||
    $('body').html();

  const $m = cheerio.load(mainHtml || html);
  const extractedText = $m.text().replace(/\s+/g, ' ').trim();

  let markdown = '';
  $m('h1,h2,h3,h4,p,li,blockquote').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = $m(el).text().trim();
    if (!text) return;
    const map = { h1: '# ', h2: '## ', h3: '### ', h4: '#### ', li: '- ', blockquote: '> ' };
    markdown += (map[tag] || '') + text + '\n\n';
  });

  return { extractedText, markdown };
}

async function backfill() {
  console.log('\n📦 CAGovNews backfill started:', new Date().toISOString());
  
  // Fetch all releases that have no content yet
  let query = supabase
    .from('releases')
    .select('id, agency_slug, source_url, title')
    .order('published_date', { ascending: false });

  if (AGENCY_FILTER) {
    query = query.eq('agency_slug', AGENCY_FILTER);
    console.log(`  Filtering to agency: ${AGENCY_FILTER}`);
  }

  const { data: releases, error } = await query;
  if (error) { console.error('Failed to fetch releases:', error); process.exit(1); }

  // Get IDs that already have content
  const { data: existing } = await supabase
    .from('release_content')
    .select('release_id');
  
  const existingIds = new Set((existing || []).map(r => r.release_id));
  const toArchive = releases.filter(r => !existingIds.has(r.id));
  
  console.log(`  Total releases: ${releases.length}`);
  console.log(`  Already archived: ${existingIds.size}`);
  console.log(`  Need archiving: ${toArchive.length}\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < toArchive.length; i++) {
    const release = toArchive[i];
    process.stdout.write(`  [${i + 1}/${toArchive.length}] ${release.agency_slug}: ${release.title.slice(0, 50)}... `);

    const { html, status, ok } = await fetchPage(release.source_url);

    if (!ok || !html) {
      console.log(`✗ (HTTP ${status})`);
      await supabase.from('release_content').upsert({
        release_id: release.id,
        scrape_status: 'failed',
        http_status: status,
        scraped_at: new Date().toISOString(),
        source_still_live: status !== 404 && status !== 410,
      });
      failed++;
    } else {
      const { extractedText, markdown } = extractContent(html);
      const hash = sha256(extractedText);

      await supabase.from('release_content').upsert({
        release_id: release.id,
        raw_html: html,
        extracted_text: extractedText,
        extracted_markdown: markdown,
        scraped_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
        scrape_status: 'ok',
        http_status: status,
        content_hash: hash,
        source_still_live: true,
      });
      console.log('✓');
      success++;
    }

    await delay(1000); // 1 second between requests
  }

  console.log(`\n✅ Done: ${success} archived, ${failed} failed out of ${toArchive.length} total`);
}

backfill().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
