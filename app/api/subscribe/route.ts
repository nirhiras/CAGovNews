import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cagovnews.com'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      email, firstName, lastName, primaryCounty,
      extraCounties, topics, newsLevels, frequencies, agreedAt
    } = body

    if (!email || !primaryCounty) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Save to subscribers table
    const { error: dbError } = await supabase
      .from('subscribers')
      .upsert({
        email: email.toLowerCase().trim(),
        first_name: firstName,
        last_name: lastName,
        primary_county: primaryCounty,
        extra_counties: extraCounties ?? [],
        topics: topics ?? [],
        news_levels: newsLevels ?? ['state','county','city'],
        frequencies: frequencies ?? ['daily'],
        active: true,
        agreed_at: agreedAt,
      }, { onConflict: 'email' })

    if (dbError) {
      console.error('DB error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Send confirmation email via Resend
    const freqLabel = (frequencies ?? ['daily']).join(', ')
    const greeting  = firstName ? `Hi ${firstName},` : 'Hello,'

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
        <strong>${primaryCounty} County</strong> and all cities within it,
        delivered <strong>${freqLabel}</strong>.
      </p>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 18px;margin-bottom:22px;">
        <div style="font-size:13px;color:#0369a1;line-height:1.8;">
          ✅ Subscription active<br>
          📍 County: <strong>${primaryCounty}${extraCounties?.length ? ` + ${extraCounties.length} more` : ''}</strong><br>
          📬 Delivery: <strong>${freqLabel}</strong>${topics?.length ? `<br>🏷 Topics: <strong>${topics.join(', ')}</strong>` : ''}
        </div>
      </div>
      <a href="${APP_URL}/news" style="display:inline-block;background:#1b3a6b;color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
        Read today's news →
      </a>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        You subscribed at cagovnews.com · 
        <a href="${APP_URL}/privacy#unsubscribe" style="color:#6b7280;">Unsubscribe</a> · 
        <a href="${APP_URL}/privacy" style="color:#6b7280;">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>`

    const emailRes = await fetch('https://api.resend.com/emails', {
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
    })

    if (!emailRes.ok) {
      const errBody = await emailRes.text()
      console.error('Resend error:', errBody)
      // Still return success — subscriber was saved, just email failed
      return NextResponse.json({ ok: true, emailSent: false })
    }

    return NextResponse.json({ ok: true, emailSent: true })

  } catch (err: any) {
    console.error('Subscribe error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
