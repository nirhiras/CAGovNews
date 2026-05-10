// supabase/functions/send-digest/index.ts
// Supabase Edge Function — triggered by crawler after new releases are found.
// Fetches today's new releases and emails each subscribed user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'https://cagovnews.com';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { newReleaseCount } = await req.json();
  const today = new Date().toISOString().split('T')[0];

  // Fetch today's new releases
  const { data: releases } = await supabase
    .from('releases')
    .select('title, agency_slug, source_url, summary, tag')
    .eq('published_date', today)
    .order('agency_slug');

  if (!releases?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  // Fetch users who want a digest
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name, agency_filter, digest_frequency')
    .eq('digest_enabled', true)
    .not('email', 'is', null);

  if (!users?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  let sent = 0;

  for (const user of users) {
    // Apply per-user agency filter if set
    let userReleases = releases;
    if (user.agency_filter?.length) {
      userReleases = releases.filter((r) =>
        user.agency_filter.includes(r.agency_slug)
      );
    }
    if (!userReleases.length) continue;

    const html = buildDigestHtml(user, userReleases, today);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CAGovNews Digest <digest@cagovnews.com>',
        to: [user.email],
        subject: `CA.gov News Digest — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} (${userReleases.length} new)`,
        html,
      }),
    });

    if (res.ok) {
      const { id: resendId } = await res.json();
      await supabase.from('email_log').insert({
        user_id: user.id,
        email_type: 'digest',
        subject: `CA.gov News Digest — ${today}`,
        resend_id: resendId,
        status: 'sent',
      });
      sent++;
    }
  }

  return new Response(JSON.stringify({ sent, releases: releases.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

function buildDigestHtml(user, releases: any[], date: string): string {
  const greeting = user.full_name ? `Hi ${user.full_name.split(' ')[0]},` : 'Hello,';

  const rows = releases
    .map(
      (r) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">${r.agency_slug}${r.tag ? ` · ${r.tag}` : ''}</div>
          <a href="${r.source_url}" style="color:#1d4ed8;text-decoration:none;font-weight:500;font-size:15px;">${r.title}</a>
          ${r.summary ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">${r.summary.slice(0, 200)}…</p>` : ''}
        </td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    
    <div style="background:#1e3a5f;padding:24px 32px;">
      <div style="color:#fff;font-size:20px;font-weight:600;">CAGovNews</div>
      <div style="color:#93c5fd;font-size:13px;margin-top:4px;">California Government News Digest</div>
    </div>

    <div style="padding:24px 32px;">
      <p style="margin:0 0 8px;font-size:15px;color:#111827;">${greeting}</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Here are <strong>${releases.length} new releases</strong> from California state agencies today.</p>

      <table style="width:100%;border-collapse:collapse;">${rows}</table>

      <div style="margin-top:24px;text-align:center;">
        <a href="${APP_URL}" style="display:inline-block;background:#1e3a5f;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">View all on CAGovNews</a>
      </div>
    </div>

    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        You're receiving this because you signed up for the CAGovNews digest.<br>
        <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(user.email)}" style="color:#6b7280;">Unsubscribe</a>
      </p>
    </div>

  </div>
</body>
</html>`;
}
