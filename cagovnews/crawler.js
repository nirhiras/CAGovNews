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
  { slug: 'Governor',      news_url: 'https://www.gov.ca.gov/newsroom/' },
  { slug: 'CDPH',          news_url: 'https://www.cdph.ca.gov/Programs/OPA/Pages/News-Releases-2026.aspx' },
  { slug: 'DOJ',           news_url: 'https://oag.ca.gov/news' },
  { slug: 'DOF',           news_url: 'https://dof.ca.gov/budget/resources-for-departments/budget-letters/' },
  { slug: 'Caltrans',      news_url: 'https://dot.ca.gov/news-releases' },
  { slug: 'CARB',          news_url: 'https://ww2.arb.ca.gov/news' },
  { slug: 'CEC',           news_url: 'https://www.energy.ca.gov/newsroom/news-releases' },
  { slug: 'CPUC',          news_url: 'https://www.cpuc.ca.gov/news-and-updates/all-news' },
  { slug: 'DMV',           news_url: 'https://www.dmv.ca.gov/portal/news-and-media/news-releases/' },
  { slug: 'DMHC',          news_url: 'https://www.dmhc.ca.gov/Resources/Newsroom/PressReleases.aspx' },
  { slug: 'Insurance',     news_url: 'https://www.insurance.ca.gov/0400-news/0100-press-releases/2026/' },
  { slug: 'DFPI',          news_url: 'https://dfpi.ca.gov/news/' },
  { slug: 'DTSC',          news_url: 'https://dtsc.ca.gov/news/' },
  { slug: 'CalPrivacy',    news_url: 'https://cppa.ca.gov/announcements/' },
  { slug: 'FPPC',          news_url: 'https://www.fppc.ca.gov/news-releases.html' },
  { slug: 'EDD',           news_url: 'https://www.edd.ca.gov/about_edd/newsreleases.htm' },
  { slug: 'Controller',    news_url: 'https://www.sco.ca.gov/eo_pressrel.html' },
  { slug: 'Treasurer',     news_url: 'https://www.treasurer.ca.gov/news/releases.asp' },
  { slug: 'Sec. of State', news_url: 'https://www.sos.ca.gov/administration/news-releases-and-advisories/2026-news-releases-and-advisories' },
  { slug: 'CDE',           news_url: 'https://www.cde.ca.gov/nr/ne/yr26/' },
  { slug: 'DHCS',          news_url: 'https://www.dhcs.ca.gov/Documents/DHCS-Press-Releases.aspx' },
  { slug: 'HCD',           news_url: 'https://www.hcd.ca.gov/about/newsroom/press-releases' },
  { slug: 'CalHFA',        news_url: 'https://www.calhfa.ca.gov/about/newsroom/' },
  { slug: 'CalRecycle',    news_url: 'https://www2.calrecycle.ca.gov/NewsRoom' },
  { slug: 'Water Board',   news_url: 'https://www.waterboards.ca.gov/press_room/press_releases/2026/' },
  { slug: 'OTS',           news_url: 'https://www.ots.ca.gov/media-and-research/news-releases/' },
  { slug: 'CDT',           news_url: 'https://cdt.ca.gov/news/' },
  { slug: 'DGS',           news_url: 'https://www.dgs.ca.gov/PD/News' },
  { slug: 'CalPERS',       news_url: 'https://www.calpers.ca.gov/page/newsroom/calpers-news' },
  { slug: 'FTB',           news_url: 'https://www.ftb.ca.gov/about-ftb/newsroom/news-releases/' },
  { slug: 'Parks',         news_url: 'https://www.parks.ca.gov/Newsroom' },
  { slug: 'CDFA',          news_url: 'https://pressreleases.cdfa.ca.gov/' },
  { slug: 'DPR',           news_url: 'https://www.cdpr.ca.gov/docs/pressrls/2026prs.htm' },
  { slug: 'CSAC',          news_url: 'https://www.csac.ca.gov/news-releases' },
  { slug: 'Cal OES',       news_url: 'https://www.caloes.ca.gov/news-release/' },
  { slug: 'OTSI',          news_url: 'https://otsi.ca.gov/' },
  { slug: 'ABC',           news_url: 'https://www.abc.ca.gov/news-releases/' },
  { slug: 'CDA',           news_url: 'https://aging.ca.gov/newsroom/' },
  { slug: 'CRD',           news_url: 'https://calcivilrights.ca.gov/news/' },
  { slug: 'CalHR',         news_url: 'https://www.calhr.ca.gov/newsroom/' },
  { slug: 'DCC',           news_url: 'https://www.cannabis.ca.gov/press-releases/' },
  { slug: 'OEHHA',         news_url: 'https://oehha.ca.gov/public-information/press-releases' },
  { slug: 'Energy Safety', news_url: 'https://energysafety.ca.gov/news/' },
  { slug: 'CDCR',          news_url: 'https://www.cdcr.ca.gov/news/' },
];

// ── Helpers ────────────────────────────────────────────────────
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (text) =>
  crypto.createHash('sha256').update(text ?? '').digest('hex');

// ── Parse a date string safely, return YYYY-MM-DD or null ─────
function parseDate(str) {
  if (!str) return null;
  try {
    const cleaned = str.trim()
      .replace(/^Published:?\s*/i, '')
      .replace(/^Date:?\s*/i, '')
      .replace(/^Posted:?\s*/i, '');
    const d = new Date(cleaned);
    if (isNaN(d)) return null;
    const year = d.getFullYear();
    if (year < 2020 || year > 2030) return null;
    return d.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

// ── Extract publish date from URL path ────────────────────────
// Handles /2026/04/15/ and /2026/04/ patterns
function extractDateFromUrl(url) {
  const fullMatch = url.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);
  if (fullMatch) {
    const [, year, month, day] = fullMatch;
    return parseDate(`${year}-${month}-${day}`);
  }
  const monthMatch = url.match(/\/(20\d{2})\/(\d{2})\//);
  if (monthMatch) {
    const [, year, month] = monthMatch;
    return parseDate(`${year}-${month}-01`);
  }
  return null;
}

// ── Extract publish date from HTML — 8 strategies ─────────────
function extractPublishDate($, bodyText, sourceUrl = '') {
  // Strategy 1: OpenGraph / standard meta tags (most reliable)
  const metaCandidates = [
    $('meta[property="article:published_time"]').attr('content'),
    $('meta[name="article:published_time"]').attr('content'),
    $('meta[property="og:updated_time"]').attr('content'),
    $('meta[name="date"]').attr('content'),
    $('meta[name="publishdate"]').attr('content'),
    $('meta[name="publish-date"]').attr('content'),
    $('meta[name="DC.date"]').attr('content'),
    $('meta[itemprop="datePublished"]').attr('content'),
    $('[itemprop="datePublished"]').attr('content') ||
    $('[itemprop="datePublished"]').text(),
  ];
  for (const val of metaCandidates) {
    const parsed = parseDate(val);
    if (parsed) return parsed;
  }

  // Strategy 2: <time> element datetime attribute
  const timeDateTime = $('time[datetime]').first().attr('datetime');
  if (timeDateTime) {
    const parsed = parseDate(timeDateTime);
    if (parsed) return parsed;
  }

  // Strategy 3: JSON-LD structured data
  let jsonLdDate = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (jsonLdDate) return;
    try {
      const json = JSON.parse($(el).html() || '{}');
      const candidates = [
        json.datePublished,
        json.dateCreated,
        json.dateModified,
        json['@graph']?.[0]?.datePublished,
      ];
      for (const c of candidates) {
        const parsed = parseDate(c);
        if (parsed) { jsonLdDate = parsed; return; }
      }
    } catch { /* ignore */ }
  });
  if (jsonLdDate) return jsonLdDate;

  // Strategy 4: Common .gov date CSS selectors
  const dateSelectors = [
    '.date', '.publish-date', '.published-date', '.post-date',
    '.entry-date', '.article-date', '.news-date', '.release-date',
    '.field-name-post-date', '.date-display-single', '.submitted',
    '.byline', '.dateline', '.timestamp', '.article-timestamp',
    '[class*="publish"]', '[class*="release-date"]',
  ];
  for (const sel of dateSelectors) {
    const text = $(sel).first().text().trim();
    if (text && text.length < 80) {
      const parsed = parseDate(text);
      if (parsed) return parsed;
    }
  }

  // Strategy 5: "FOR IMMEDIATE RELEASE" dateline
  const immediateMatch = bodyText.match(
    /FOR\s+IMMEDIATE\s+RELEASE[:\s]*[\r\n]+\s*([A-Z][a-z]+ \d{1,2},\s*20\d{2})/i
  );
  if (immediateMatch) {
    const parsed = parseDate(immediateMatch[1]);
    if (parsed) return parsed;
  }

  // Strategy 6: "SACRAMENTO –" dateline
  const sacMatch = bodyText.match(
    /SACRAMENTO\s*[–\-—,]\s*([A-Z][a-z]+ \d{1,2},?\s*20\d{2})/i
  );
  if (sacMatch) {
    const parsed = parseDate(sacMatch[1]);
    if (parsed) return parsed;
  }

  // Strategy 7: Date from URL
  const urlDate = extractDateFromUrl(sourceUrl);
  if (urlDate) return urlDate;

  // Strategy 8: Generic date pattern in body text (last resort)
  const genericPatterns = [
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*20\d{2}\b/i,
    /\b20\d{2}-\d{2}-\d{2}\b/,
    /\b\d{1,2}\/\d{1,2}\/20\d{2}\b/,
  ];
  for (const pattern of genericPatterns) {
    const match = bodyText.match(pattern);
    if (match) {
      const parsed = parseDate(match[0]);
      if (parsed) return parsed;
    }
  }

  return null;
}

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

function extractContent(html, sourceUrl = '') {
  const $ = cheerio.load(html);

  // Remove nav/chrome elements
  $(
    'nav, footer, script, style, iframe, ' +
    '.sidebar, .nav, .footer, .menu, .navigation, .site-nav, ' +
    '.site-header, .site-footer, .header, .cookie-banner, .alert-bar, ' +
    '#nav, #footer, #header, #sidebar, #menu, ' +
    '[role="navigation"], [role="banner"], [role="contentinfo"]'
  ).remove();

  // Find main content block
  const mainHtml =
    $('article').first().html() ||
    $('main').first().html() ||
    $(
      '.press-release, .news-release, .content-area, ' +
      '#main-content, .page-content, .entry-content, ' +
      '.post-content, .article-body, .release-body'
    ).first().html() ||
    $('body').html();

  const $m = cheerio.load(mainHtml || html);
  const extractedText = $m.text().replace(/\s+/g, ' ').trim();

  // Build markdown
  let markdown = '';
  $m('h1, h2, h3, h4, p, li, blockquote').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = $m(el).text().trim();
    if (!text) return;
    const prefix = { h1: '# ', h2: '## ', h3: '### ', h4: '#### ', li: '- ', blockquote: '> ' };
    markdown += (prefix[tag] || '') + text + '\n\n';
  });

  // Extract publish date using all 8 strategies
  const bodyText = $('body').text();
  const publishedDate = extractPublishDate($, bodyText, sourceUrl);

  return { extractedText, markdown, publishedDate };
}

// ── Archive a single article URL ──────────────────────────────
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
    return { publishedDate: null };
  }

  const { extractedText, markdown, publishedDate } = extractContent(html, articleUrl);
  const hash = sha256(extractedText);

  if (!DRY_RUN) {
    // Check if content unchanged since last scrape
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
      return { publishedDate };
    }

    // Save full archived content
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

    // Update published_date with accurately extracted date
    if (publishedDate) {
      await supabase
        .from('releases')
        .update({ published_date: publishedDate })
        .eq('id', releaseId);
    }
  } else {
    console.log(`    [DRY RUN] Would archive: ${articleUrl.slice(0, 80)}`);
    if (publishedDate) console.log(`    [DRY RUN] Extracted date: ${publishedDate}`);
  }

  return { publishedDate };
}

// ── Scrape agency newsroom for article links ──────────────────
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

    if (!fullUrl.match(/\.gov/)) return;
    if (fullUrl.match(/\/(search|contact|about|privacy|sitemap|login|subscribe|feedback|careers|glossary|faq)/i)) return;
    if (seen.has(fullUrl)) return;

    seen.add(fullUrl);
    links.push({ url: fullUrl, title });
  });

  return { links };
}

// ── Main ───────────────────────────────────────────────────────
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
          // Pre-extract date from URL before hitting the article page
          const urlDate = extractDateFromUrl(link.url);

          const { data: release } = await supabase
            .from('releases')
            .upsert(
              {
                agency_slug: agency.slug,
                title: link.title,
                source_url: link.url,
                published_date: urlDate || new Date().toISOString().split('T')[0],
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
          const urlDate = extractDateFromUrl(link.url);
          console.log(`    [DRY] ${link.title.slice(0, 55)} ${urlDate ? `(${urlDate})` : ''}`);
        }
      }
    } catch (err) {
      errors.push({ agency: agency.slug, error: err.message });
      console.error(`  ✗ ${agency.slug}: ${err.message}`);
    }

    await delay(3000);
  }

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
