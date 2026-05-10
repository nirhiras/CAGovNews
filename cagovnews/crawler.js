/**
 * cagovnews.com — Daily Crawler with Full Content Archiving
 *
 * Scrapes 40+ California .gov agency newsrooms, saves structured metadata
 * to the `releases` table and full article content to `release_content`.
 *
 * Usage:
 *   node crawler.js              — crawl all agencies
 *   AGENCY_FILTER=DMV node crawler.js  — crawl one agency
 *   DRY_RUN=true node crawler.js       — scrape but don't write to DB
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

// ── Supabase (service role — bypasses RLS, server-side only) ──
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DRY_RUN = process.env.DRY_RUN === 'true';
const AGENCY_FILTER = process.env.AGENCY_FILTER || null;

// ── Agency list ────────────────────────────────────────────────
const AGENCIES = [
  { slug: 'Governor',     news_url: 'https://www.gov.ca.gov/newsroom/' },
  { slug: 'CDPH',         news_url: 'https://www.cdph.ca.gov/Programs/OPA/Pages/News-Releases-2026.aspx' },
  { slug: 'DOJ',          news_url: 'https://oag.ca.gov/news' },
  { slug: 'DOF',          news_url: 'https://dof.ca.gov/budget/resources-for-departments/budget-letters/' },
  { slug: 'Caltrans',     news_url: 'https://dot.ca.gov/news-releases' },
  { slug: 'CARB',         news_url: 'https://ww2.arb.ca.gov/news' },
  { slug: 'CEC',          news_url: 'https://www.energy.ca.gov/newsroom/news-releases' },
  { slug: 'CPUC',         news_url: 'https://www.cpuc.ca.gov/news-and-updates/all-news' },
  { slug: 'DMV',          news_url: 'https://www.dmv.ca.gov/portal/news-and-media/news-releases/' },
  { slug: 'DMHC',         news_url: 'https://www.dmhc.ca.gov/Resources/Newsroom/PressReleases.aspx' },
  { slug: 'Insurance',    news_url: 'https://www.insurance.ca.gov/0400-news/0100-press-releases/2026/' },
  { slug: 'DFPI',         news_url: 'https://dfpi.ca.gov/news/' },
  { slug: 'DTSC',         news_url: 'https://dtsc.ca.gov/news/' },
  { slug: 'CalPrivacy',   news_url: 'https://cppa.ca.gov/announcements/' },
  { slug: 'FPPC',         news_url: 'https://www.fppc.ca.gov/news-releases.html' },
  { slug: 'EDD',          news_url: 'https://www.edd.ca.gov/about_edd/newsreleases.htm' },
  { slug: 'Controller',   news_url: 'https://www.sco.ca.gov/eo_pressrel.html' },
  { slug: 'Treasurer',    news_url: 'https://www.treasurer.ca.gov/news/releases.asp' },
  { slug: 'Sec. of State',news_url: 'https://www.sos.ca.gov/administration/news-releases-and-advisories/2026-news-releases-and-advisories' },
  { slug: 'CDE',          news_url: 'https://www.cde.ca.gov/nr/ne/yr26/' },
  { slug: 'DHCS',         news_url: 'https://www.dhcs.ca.gov/Documents/DHCS-Press-Releases.aspx' },
  { slug: 'HCD',          news_url: 'https://www.hcd.ca.gov/about/newsroom/press-releases' },
  { slug: 'CalHFA',       news_url: 'https://www.calhfa.ca.gov/about/newsroom/' },
  { slug: 'CalRecycle',   news_url: 'https://www2.calrecycle.ca.gov/NewsRoom' },
  { slug: 'Water Board',  news_url: 'https://www.waterboards.ca.gov/press_room/press_releases/2026/' },
  { slug: 'OTS',          news_url: 'https://www.ots.ca.gov/media-and-research/news-releases/' },
  { slug: 'CDT',          news_url: 'https://cdt.ca.gov/news/' },
  { slug: 'DGS',          news_url: 'https://www.dgs.ca.gov/PD/News' },
  { slug: 'CalPERS',      news_url: 'https://www.calpers.ca.gov/page/newsroom/calpers-news' },
  { slug: 'FTB',          news_url: 'https://www.ftb.ca.gov/about-ftb/newsroom/news-releases/' },
  { slug: 'Parks',        news_url: 'https://www.parks.ca.gov/Newsroom' },
  { slug: 'CDFA',         news_url: 'https://pressreleases.cdfa.ca.gov/' },
  { slug: 'DPR',          news_url: 'https://www.cdpr.ca.gov/docs/pressrls/2026prs.htm' },
  { slug: 'CSAC',         news_url: 'https://www.csac.ca.gov/news-releases' },
  { slug: 'Cal OES',      news_url: 'https://www.caloes.ca.gov/news-release/' },
  { slug: 'OTSI',         news_url: 'https://otsi.ca.gov/' },
  { slug: 'ABC',          news_url: 'https://www.abc.ca.gov/news-releases/' },
  { slug: 'CDA',          news_url: 'https://aging.ca.gov/newsroom/' },
  { slug: 'CRD',          news_url: 'https://calcivilrights.ca.gov/news/' },
  { slug: 'CalHR',        news_url: 'https://www.calhr.ca.gov/newsroom/' },
  { slug: 'DCC',          news_url: 'https://www.cannabis.ca.gov/press-releases/' },
  { slug: 'OEHHA',        news_url: 'https://oehha.ca.gov/public-information/press-releases' },
  { slug: 'Energy Safety',news_url: 'https://energysafety.ca.gov/news/' },
  { slug: 'CDCR',         news_url: 'https://www.cdcr.ca.gov/news/' },
];

// ── Helpers ────────────────────────────────────────────────────
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (text) =>
  crypto.createHash('sha256').update(text ?? '').digest('hex');

async function fetchPage(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'CAGovNews-Crawler/1.0 (cagovnews.com; aggregating California .gov press releases)',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeout: 15000,
      });
      const html = await res.text();
      return { html, status: res.status, ok: res.ok };
    } catch (err) {
      if (attempt === retries)
        return { html: null, status: 0, ok: false, error: err.message };
      await delay(2000 * (attempt + 1));
    }
  }
}

function extractContent(html) {
  const $ = cheerio.load(html);
  $('nav,footer,script,style,iframe,.sidebar,.nav,.footer,.menu,#nav,#footer,#header,.header').remove();

  const mainHtml =
    $('article').first().html() ||
    $('main').first().html() ||
    $('.press-release,.news-release,.content-area,#main-content,.page-content').first().html() ||
    $('body').html();

  const $m = cheerio.load(mainHtml || html);
  const extractedText = $m.text().replace(/\s+/g, ' ').trim();

  // Build markdown
  let markdown = '';
  $m('h1,h2,h3,h4,p,li,blockquote').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = $m(el).text().trim();
    if (!text) return;
    const map = { h1: '# ', h2: '## ', h3: '### ', h4: '#### ', li: '- ', blockquote: '> ' };
    markdown += (map[tag] || '') + text + '\n\n';
  });

  // Attempt to extract publish date
  const bodyText = $('body').text();
  const patterns = [/(\w+ \d{1,2},\s*202\d)/i, /202\d-\d{2}-\d{2}/];
  let publishedDate = null;
  for (const p of patterns) {
    const m = bodyText.match(p);
    if (m) {
      const d = new Date(m[0]);
      if (!isNaN(d) && d.getFullYear() >= 2026) {
        publishedDate = d.toISOString().split('T')[0];
        break;
      }
    }
  }

  return { extractedText, markdown, publishedDate };
}

// ── Archive a single article URL ───────────────────────────────
async function archiveArticle(releaseId, articleUrl) {
  const { html, status, ok } = await fetchPage(articleUrl);

  if (!ok || !html) {
    if (!DRY_RUN) {
      await supabase.from('release_content').upsert({
        release_id: releaseId,
        scrape_status: 'failed',
        http_status: status,
        scraped_at: new Date().toISOString(),
        source_still_live: status !== 404 && status !== 410,
      });
    }
    return;
  }

  const { extractedText, markdown, publishedDate } = extractContent(html);
  const hash = sha256(extractedText);

  if (!DRY_RUN) {
    // Check if unchanged
    const { data: existing } = await supabase
      .from('release_content')
      .select('content_hash')
      .eq('release_id', releaseId)
      .single();

    if (existing?.content_hash === hash) {
      await supabase
        .from('release_content')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('release_id', releaseId);
      return;
    }

    await supabase.from('release_content').upsert({
      release_id: releaseId,
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

    // Update published_date if we extracted one from the article
    if (publishedDate) {
      await supabase
        .from('releases')
        .update({ published_date: publishedDate })
        .eq('id', releaseId);
    }
  } else {
    console.log(`    [DRY RUN] Would archive: ${articleUrl.slice(0, 80)}`);
  }
}

// ── Scrape agency newsroom for article links ───────────────────
async function scrapeAgencyNewsroom(agency) {
  const { html, ok } = await fetchPage(agency.news_url);
  if (!ok || !html) {
    return { links: [], error: `Failed to fetch ${agency.news_url}` };
  }

  const $ = cheerio.load(html);
  const seen = new Set();
  const links = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const title = $(el).text().trim();

    if (!href || title.length < 10) return;
    if (href.startsWith('#') || href.startsWith('mailto:')) return;

    let fullUrl;
    try {
      fullUrl = new URL(href, agency.news_url).href;
    } catch {
      return;
    }

    // Must be a .gov URL
    if (!fullUrl.match(/\.gov/)) return;
    // Skip utility pages
    if (fullUrl.match(/\/(search|contact|about|privacy|sitemap|login|subscribe|feedback)/i)) return;
    // Skip already seen
    if (seen.has(fullUrl)) return;

    seen.add(fullUrl);
    links.push({ url: fullUrl, title });
  });

  return { links };
}

// ── Main ────────────────────────────────────────────────────────
async function runCrawler() {
  console.log('\n🕷️  CAGovNews crawler started:', new Date().toISOString());
  if (DRY_RUN) console.log('   DRY RUN — no database writes\n');

  const agenciesToRun = AGENCY_FILTER
    ? AGENCIES.filter((a) => a.slug === AGENCY_FILTER)
    : AGENCIES;

  if (agenciesToRun.length === 0) {
    console.error(`No agency found matching: ${AGENCY_FILTER}`);
    process.exit(1);
  }

  // Open crawl log entry
  let crawlId = null;
  if (!DRY_RUN) {
    const { data } = await supabase
      .from('crawl_log')
      .insert({ triggered_by: process.env.GITHUB_ACTIONS ? 'cron' : 'manual' })
      .select()
      .single();
    crawlId = data?.id;
  }

  let totalFound = 0;
  let totalNew = 0;
  const errors = [];

  for (const agency of agenciesToRun) {
    try {
      console.log(`  → ${agency.slug}`);
      const { links = [], error } = await scrapeAgencyNewsroom(agency);

      if (error) {
        errors.push({ agency: agency.slug, error });
        console.warn(`    ✗ ${error}`);
        continue;
      }

      totalFound += links.length;
      console.log(`    Found ${links.length} links`);

      for (const link of links) {
        if (!DRY_RUN) {
          // Upsert release metadata
          const { data: release, error: upsertErr } = await supabase
            .from('releases')
            .upsert(
              {
                agency_slug: agency.slug,
                title: link.title,
                source_url: link.url,
                published_date: new Date().toISOString().split('T')[0],
              },
              { onConflict: 'agency_slug,source_url' }
            )
            .select('id, release_content(content_hash)')
            .single();

          if (release) {
            const isNew = !release.release_content;
            if (isNew) totalNew++;
            await archiveArticle(release.id, link.url);
            await delay(1500);
          }
        } else {
          console.log(`    [DRY] ${link.title.slice(0, 60)}`);
        }
      }
    } catch (err) {
      errors.push({ agency: agency.slug, error: err.message });
      console.error(`  ✗ ${agency.slug}: ${err.message}`);
    }

    await delay(3000); // polite gap between agencies
  }

  // Close crawl log
  if (!DRY_RUN && crawlId) {
    await supabase.from('crawl_log').update({
      finished_at: new Date().toISOString(),
      agencies_checked: agenciesToRun.length,
      releases_found: totalFound,
      releases_new: totalNew,
      errors: errors.length ? errors : null,
    }).eq('id', crawlId);
  }

  console.log(`\n✅ Done — ${totalNew} new | ${totalFound} found | ${errors.length} errors`);

  // Trigger digest email if new releases exist
  if (totalNew > 0 && !DRY_RUN) {
    await triggerDigest(totalNew);
  }
}

async function triggerDigest(newCount) {
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/send-digest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newReleaseCount: newCount }),
    });
    console.log(res.ok ? '📧 Digest triggered' : `📧 Digest failed: ${await res.text()}`);
  } catch (err) {
    console.error('📧 Digest error:', err.message);
  }
}

runCrawler().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
