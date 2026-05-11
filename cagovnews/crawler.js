/**
 * cagovnews.com — Daily Crawler with Full Content Archiving
 * Preserves rich HTML content: images, links, bullets, headings, blockquotes
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DRY_RUN = process.env.DRY_RUN === 'true';
const AGENCY_FILTER = process.env.AGENCY_FILTER || null;

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

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (text) => crypto.createHash('sha256').update(text ?? '').digest('hex');

function parseDate(str) {
  if (!str) return null;
  try {
    const cleaned = str.trim().replace(/^(Published|Date|Posted):?\s*/i, '');
    const d = new Date(cleaned);
    if (isNaN(d)) return null;
    const y = d.getFullYear();
    if (y < 2020 || y > 2030) return null;
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

function extractPublishDate($, bodyText, sourceUrl) {
  for (const val of [
    $('meta[property="article:published_time"]').attr('content'),
    $('meta[name="article:published_time"]').attr('content'),
    $('meta[name="date"]').attr('content'),
    $('meta[name="publishdate"]').attr('content'),
    $('meta[name="DC.date"]').attr('content'),
    $('[itemprop="datePublished"]').attr('content') || $('[itemprop="datePublished"]').text(),
  ]) { const p = parseDate(val); if (p) return p; }

  const t = $('time[datetime]').first().attr('datetime');
  if (t) { const p = parseDate(t); if (p) return p; }

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

  for (const sel of ['.date','.publish-date','.published-date','.entry-date','.release-date','.dateline','.timestamp']) {
    const t2 = $(sel).first().text().trim();
    if (t2 && t2.length < 80) { const p = parseDate(t2); if (p) return p; }
  }

  const ir = bodyText.match(/FOR\s+IMMEDIATE\s+RELEASE[:\s]*[\r\n]+\s*([A-Z][a-z]+ \d{1,2},\s*20\d{2})/i);
  if (ir) { const p = parseDate(ir[1]); if (p) return p; }

  const sac = bodyText.match(/SACRAMENTO\s*[–\-—,]\s*([A-Z][a-z]+ \d{1,2},?\s*20\d{2})/i);
  if (sac) { const p = parseDate(sac[1]); if (p) return p; }

  const ud = extractDateFromUrl(sourceUrl); if (ud) return ud;

  for (const pat of [
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*20\d{2}\b/i,
    /\b20\d{2}-\d{2}-\d{2}\b/,
  ]) { const m = bodyText.match(pat); if (m) { const p = parseDate(m[0]); if (p) return p; } }

  return null;
}

// ── Smart HTML cleaner — keeps rich content, removes chrome ───
function extractArticleHtml($, sourceUrl) {
  const baseUrl = (() => { try { return new URL(sourceUrl).origin; } catch { return ''; } })();

  // Remove ALL chrome elements first
  $([
    'nav','header','footer','aside',
    '[role="navigation"]','[role="banner"]','[role="contentinfo"]',
    '.nav','.navigation','.site-nav','.site-header','.site-footer',
    '#nav','#header','#footer','#menu','#masthead','#sidebar',
    '.sidebar','.widget','.widget-area','.related-posts',
    '.recent-posts','.post-navigation','.nav-links','.pagination',
    '[class*="sidebar"]','[class*="widget"]','[class*="related"]',
    '[class*="share"]','[class*="social"]','[class*="newsletter"]',
    '.breadcrumb','.site-breadcrumbs','.back-to-top',
    '.cookie-banner','.cookie-notice','.alert-bar',
    '.skip-to-content','.screen-reader-text',
    'script','style','noscript','iframe',
    '#comments','.comments-area','.comment-form',
  ].join(',')).remove();

  // Find article body — priority order for .gov sites
  const contentSelectors = [
    'article .entry-content',
    'article .post-content',
    '.entry-content',
    '.post-content',
    '.article-body',
    '.press-release-body',
    '.news-release-body',
    '.field-items .field-item',
    'article',
    'main',
    '.page-content',
    '#main-content',
  ];

  let $content = null;
  for (const sel of contentSelectors) {
    const el = $(sel).first();
    if (el.length && el.text().trim().length > 100) {
      $content = el;
      break;
    }
  }
  if (!$content || !$content.length) $content = $('body');

  // Fix relative URLs to absolute so images/links work in iframe
  $content.find('img[src]').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (src.startsWith('/') && baseUrl) $(el).attr('src', baseUrl + src);
    $(el).removeAttr('srcset'); // avoid broken srcset
    $(el).attr('loading', 'lazy');
    $(el).attr('style', 'max-width:100%;height:auto;border-radius:6px;margin:12px 0;display:block;');
  });

  $content.find('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.startsWith('/') && baseUrl) $(el).attr('href', baseUrl + href);
    $(el).attr('target', '_blank');
    $(el).attr('rel', 'noopener noreferrer');
  });

  // Remove any leftover sidebars inside content
  $content.find([
    '.sidebar','.widget','aside','.related-posts',
    '.post-navigation','[class*="sidebar"]','[class*="widget"]',
    '[class*="related"]','[class*="share"]','.back-to-top',
  ].join(',')).remove();

  const articleHtml = $content.html() || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  *{box-sizing:border-box;}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Georgia,serif;font-size:16px;line-height:1.75;color:#1a202c;background:#fff;margin:0;padding:20px 24px;max-width:800px;}
  h1,h2,h3,h4{color:#1b3a6b;line-height:1.3;margin-top:1.5em;margin-bottom:0.4em;}
  h2{font-size:1.25em;border-bottom:2px solid #e5e7eb;padding-bottom:0.3em;}
  h3{font-size:1.1em;}
  p{margin:0.75em 0;}
  a{color:#1d4ed8;}
  a:hover{text-decoration:underline;}
  ul,ol{padding-left:1.5em;margin:0.75em 0;}
  li{margin:0.35em 0;}
  img{max-width:100%;height:auto;border-radius:6px;margin:14px 0;display:block;}
  blockquote{border-left:4px solid #1b3a6b;margin:1.2em 0;padding:0.8em 1.2em;background:#eff6ff;border-radius:0 6px 6px 0;color:#374151;font-style:italic;}
  blockquote p{margin:0;}
  strong,b{color:#111827;font-weight:600;}
  em,i{font-style:italic;}
  table{width:100%;border-collapse:collapse;margin:1em 0;}
  td,th{padding:8px 12px;border:1px solid #e5e7eb;text-align:left;}
  th{background:#f3f4f6;font-weight:600;}
  hr{border:none;border-top:1px solid #e5e7eb;margin:1.5em 0;}
  figure{margin:1em 0;}
  figcaption{font-size:0.85em;color:#6b7280;margin-top:4px;}
  .wp-block-quote cite{font-size:0.9em;color:#6b7280;font-style:normal;}
  nav,.navigation,.nav,[class*="menu"],[class*="breadcrumb"],.recent-posts{display:none!important;}
</style>
</head>
<body>${articleHtml}</body>
</html>`;
}

async function fetchPage(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'CAGovNews-Crawler/1.0 (cagovnews.com; aggregating California .gov press releases)',
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
  const bodyText = $('body').text();
  const publishedDate = extractPublishDate($, bodyText, sourceUrl);

  let rawHtml;
  try { rawHtml = extractArticleHtml($, sourceUrl); }
  catch { rawHtml = html; }

  const $m = cheerio.load(rawHtml);
  const extractedText = $m('body').text().replace(/\s+/g, ' ').trim();

  let markdown = '';
  $m('h1,h2,h3,h4,p,li,blockquote').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = $m(el).text().trim(); if (!text) return;
    const pre = {h1:'# ',h2:'## ',h3:'### ',h4:'#### ',li:'- ',blockquote:'> '};
    markdown += (pre[tag]||'') + text + '\n\n';
  });

  return { extractedText, markdown, publishedDate, rawHtml };
}

async function archiveArticle(releaseId, articleUrl) {
  const { html, status, ok } = await fetchPage(articleUrl);

  if (!ok || !html) {
    if (!DRY_RUN) {
      await supabase.from('release_content').upsert({
        release_id: releaseId, scrape_status: 'failed', http_status: status,
        scraped_at: new Date().toISOString(), source_still_live: status !== 404 && status !== 410,
      });
    }
    return { publishedDate: null };
  }

  const { extractedText, markdown, publishedDate, rawHtml } = extractContent(html, articleUrl);
  const hash = sha256(extractedText);

  if (!DRY_RUN) {
    const { data: existing } = await supabase.from('release_content')
      .select('content_hash').eq('release_id', releaseId).single();

    if (existing?.content_hash === hash) {
      await supabase.from('release_content')
        .update({ last_checked_at: new Date().toISOString() }).eq('release_id', releaseId);
      return { publishedDate };
    }

    await supabase.from('release_content').upsert({
      release_id: releaseId, raw_html: rawHtml,
      extracted_text: extractedText, extracted_markdown: markdown,
      scraped_at: new Date().toISOString(), last_checked_at: new Date().toISOString(),
      scrape_status: 'ok', http_status: status, content_hash: hash, source_still_live: true,
    });

    if (publishedDate) {
      await supabase.from('releases').update({ published_date: publishedDate }).eq('id', releaseId);
    }
  }

  return { publishedDate };
}

async function scrapeAgencyNewsroom(agency) {
  const { html, ok } = await fetchPage(agency.news_url);
  if (!ok || !html) return { links: [], error: `Failed to fetch ${agency.news_url}` };

  const $ = cheerio.load(html);
  const seen = new Set();
  const links = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const title = $(el).text().trim();
    if (!href || title.length < 10) return;
    if (href.startsWith('#') || href.startsWith('mailto:')) return;
    let fullUrl;
    try { fullUrl = new URL(href, agency.news_url).href; } catch { return; }
    if (!fullUrl.match(/\.gov/)) return;
    if (fullUrl.match(/\/(search|contact|about|privacy|sitemap|login|subscribe|feedback|careers|faq)/i)) return;
    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);
    links.push({ url: fullUrl, title });
  });

  return { links };
}

async function runCrawler() {
  console.log('\n🕷️  CAGovNews crawler started:', new Date().toISOString());
  if (DRY_RUN) console.log('   DRY RUN\n');

  const agenciesToRun = AGENCY_FILTER ? AGENCIES.filter(a => a.slug === AGENCY_FILTER) : AGENCIES;
  if (!agenciesToRun.length) { console.error(`No agency: ${AGENCY_FILTER}`); process.exit(1); }

  let crawlId = null;
  if (!DRY_RUN) {
    const { data } = await supabase.from('crawl_log')
      .insert({ triggered_by: process.env.GITHUB_ACTIONS ? 'cron' : 'manual' }).select().single();
    crawlId = data?.id;
  }

  let totalFound = 0, totalNew = 0;
  const errors = [];

  for (const agency of agenciesToRun) {
    try {
      console.log(`  → ${agency.slug}`);
      const { links = [], error } = await scrapeAgencyNewsroom(agency);
      if (error) { errors.push({ agency: agency.slug, error }); console.warn(`    ✗ ${error}`); continue; }
      totalFound += links.length;
      console.log(`    Found ${links.length} links`);

      for (const link of links) {
        if (!DRY_RUN) {
          const urlDate = extractDateFromUrl(link.url);
          const { data: release } = await supabase.from('releases').upsert(
            { agency_slug: agency.slug, title: link.title, source_url: link.url,
              published_date: urlDate || new Date().toISOString().split('T')[0] },
            { onConflict: 'agency_slug,source_url' }
          ).select('id, release_content(content_hash)').single();

          if (release) {
            if (!release.release_content) totalNew++;
            await archiveArticle(release.id, link.url);
            await delay(1500);
          }
        } else {
          console.log(`    [DRY] ${link.title.slice(0,60)}`);
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
      finished_at: new Date().toISOString(), agencies_checked: agenciesToRun.length,
      releases_found: totalFound, releases_new: totalNew,
      errors: errors.length ? errors : null,
    }).eq('id', crawlId);
  }

  console.log(`\n✅ Done — ${totalNew} new | ${totalFound} found | ${errors.length} errors`);
  if (totalNew > 0 && !DRY_RUN) await triggerDigest(totalNew);
}

async function triggerDigest(newCount) {
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/send-digest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ newReleaseCount: newCount }),
    });
    console.log(res.ok ? '📧 Digest triggered' : `📧 Digest failed: ${await res.text()}`);
  } catch (err) { console.error('📧 Digest error:', err.message); }
}

runCrawler().catch(err => { console.error('Fatal:', err); process.exit(1); });
