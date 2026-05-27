// supabase/functions/send-confirmation/index.ts
// Sends a welcome/confirmation email when someone subscribes via the form.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'https://cagovnews.com';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const { email, firstName, county, frequencies } = await req.json();
  if (!email) return new Response('Missing email', { status: 400 });

  const greeting = firstName ? `Hi ${firstName},` : 'Hello,';
  const freqList = (frequencies || ['daily']).join(', ');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#1b3a6b;padding:24px 32px;">
      <div style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.02em;">CAGovNews</div>
      <div style="color:#93c5fd;font-size:13px;margin-top:4px;">California Government News</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 10px;font-size:16px;color:#111827;font-weight:600;">${greeting}</p>
      <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
        You're now subscribed to <strong>CAGovNews</strong>! You'll receive California government news for
        <strong>${county} County</strong> and all cities within it, delivered <strong>${freqList}</strong>.
      </p>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 18px;margin-bottom:22px;">
        <div style="font-size:13px;color:#0369a1;line-height:1.6;">
          ✅ Your subscription is active<br>
          📍 County: <strong>${county}</strong><br>
          📬 Delivery: <strong>${freqList}</strong>
        </div>
      </div>
      <a href="${APP_URL}/news" style="display:inline-block;background:#1b3a6b;color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
        Read today's news →
      </a>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        You're receiving this because you subscribed at cagovnews.com.<br>
        <a href="${APP_URL}/privacy#unsubscribe" style="color:#6b7280;">Unsubscribe</a> · 
        <a href="${APP_URL}/privacy" style="color:#6b7280;">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'CAGovNews <welcome@cagovnews.com>',
      to: [email],
      subject: `Welcome to CAGovNews — you're subscribed!`,
      html,
    }),
  });

  const body = await res.json();
  return new Response(JSON.stringify({ ok: res.ok, ...body }), {
    status: res.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  });
});
