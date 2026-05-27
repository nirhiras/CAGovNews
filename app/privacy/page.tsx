// @ts-nocheck
'use client'
import { useState } from 'react'

const LAST_UPDATED = 'May 26, 2026'

export default function PrivacyPolicy() {
  const [unsubEmail, setUnsubEmail] = useState('')
  const [unsubDone, setUnsubDone]   = useState(false)
  const [unsubError, setUnsubError] = useState('')

  function handleUnsub() {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!unsubEmail.trim()) { setUnsubError('Please enter your email address.'); return }
    if (!re.test(unsubEmail.trim())) { setUnsubError('Please enter a valid email address.'); return }
    setUnsubError('')
    setUnsubDone(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f3', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Top bar */}
      <div style={{ background: '#1b3a6b', padding: '6px 32px', fontSize: 11, color: '#fff', fontWeight: 500, letterSpacing: '.04em' }}>
        California Government News
      </div>

      {/* Header */}
      <div style={{ background: '#1b3a6b', borderBottom: '3px solid #f5a623', padding: '0 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54 }}>
          <a href="/news" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: '#fff', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#1b3a6b' }}>CA</div>
            <div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>CA Gov News</div>
              <div style={{ color: '#93c5fd', fontSize: 9 }}>California Government News</div>
            </div>
          </a>
          <a href="/news" style={{ color: '#93c5fd', fontSize: 12, textDecoration: 'none' }}>← Back to news</a>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 24px 80px' }}>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: '#111', marginBottom: 8, fontFamily: "'Source Serif 4', Georgia, serif" }}>Privacy Policy</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Last updated: {LAST_UPDATED} · Effective date: January 1, 2026</p>
        </div>

        <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, padding: '14px 18px', marginBottom: 32, fontSize: 13, color: '#3730a3', lineHeight: 1.6 }}>
          <strong>Summary:</strong> CAGovNews.com collects only what is necessary to operate the service. We never sell your data. California residents have full rights under CCPA/CPRA to access, delete, and opt out. See details below.
        </div>

        {[
          {
            title: '1. Who We Are',
            body: `CAGovNews.com ("CAGovNews," "we," "us," or "our") is an independent California-based news aggregation service. We aggregate publicly available press releases and news from official California state agency websites (.gov). CAGovNews.com is not affiliated with, endorsed by, or operated by the State of California or any California government agency.

Contact: privacy@cagovnews.com`
          },
          {
            title: '2. Information We Collect',
            body: `We collect only the information you voluntarily provide when subscribing to our email digest:

• First and last name
• Email address
• County and city preferences
• Topic and agency preferences
• Delivery frequency preferences

We do not collect payment information, Social Security numbers, driver's license numbers, or any sensitive personal information as defined under California law.

When you visit our website, our hosting provider may automatically log standard server data including IP address, browser type, referring URL, and pages visited. This data is used solely for security and performance monitoring and is not linked to your identity.`
          },
          {
            title: '3. How We Use Your Information',
            body: `We use your personal information solely to:

• Send you the news digest you requested, at the frequency you selected
• Send a one-time confirmation email when you subscribe or unsubscribe
• Respond to feedback or support requests you initiate

We do not use your information for advertising, profiling, automated decision-making, or any purpose beyond delivering the service you requested.`
          },
          {
            title: '4. California Consumer Privacy Act (CCPA/CPRA)',
            body: `As a California resident, you have the following rights under the California Consumer Privacy Act (Cal. Civ. Code § 1798.100 et seq.) as amended by the California Privacy Rights Act (CPRA):

Right to Know: You may request disclosure of the categories and specific pieces of personal information we have collected about you.

Right to Delete: You may request deletion of your personal information. We will delete your data and direct any service providers to do the same, subject to legal exceptions.

Right to Correct: You may request correction of inaccurate personal information we hold about you.

Right to Opt-Out of Sale or Sharing: We do not sell or share your personal information. You have this right, and we honor it by default.

Right to Limit Use of Sensitive Personal Information: We do not collect sensitive personal information as defined under CPRA.

Right to Non-Discrimination: We will not discriminate against you for exercising any of these rights.

To exercise your rights, email privacy@cagovnews.com or use the unsubscribe form on this page. We will respond within 45 days as required by law.`
          },
          {
            title: '5. California Online Privacy Protection Act (CalOPPA)',
            body: `In compliance with CalOPPA (Cal. Bus. & Prof. Code § 22575 et seq.):

• This privacy policy is posted prominently and accessible from our homepage footer
• We honor Do Not Track (DNT) signals from browsers; we do not track users across third-party websites
• Users may update their email preferences or unsubscribe at any time using the link in every email or the form on this page`
          },
          {
            title: '6. Email Communications & CAN-SPAM Compliance',
            body: `All marketing emails we send comply with the CAN-SPAM Act (15 U.S.C. § 7701). Every email from CAGovNews.com includes:

• Our physical mailing address
• A clear and conspicuous unsubscribe link
• Accurate "From" and subject line information

You may unsubscribe at any time. Unsubscribe requests are processed within 10 business days. After unsubscribing, we retain your email address solely to honor your opt-out and prevent future re-subscription without your consent.`
          },
          {
            title: '7. Data Sharing & Disclosure',
            body: `We do not sell, rent, trade, or share your personal information with third parties for commercial purposes.

We may disclose personal information only in the following limited circumstances:

• Service providers: We use Supabase for database hosting and email delivery services. These providers process data solely on our behalf under written data processing agreements and are prohibited from using your data for any other purpose.
• Legal compliance: We may disclose information if required by law, court order, or valid governmental request, or to protect the rights and safety of our users or the public.
• Business transfer: In the event of a merger or acquisition, user data would transfer to the successor entity under the same privacy protections described here.`
          },
          {
            title: '8. Data Retention',
            body: `We retain your personal information only as long as necessary to provide the service or as required by law:

• Active subscribers: Data retained for the duration of your subscription
• After unsubscription: Email address retained for 12 months solely to honor your opt-out preference, then permanently deleted
• Server logs: Retained for 90 days for security purposes, then deleted

You may request immediate deletion of your data at any time by emailing privacy@cagovnews.com.`
          },
          {
            title: '9. Security',
            body: `We implement reasonable and appropriate technical and organizational security measures to protect your personal information against unauthorized access, disclosure, alteration, or destruction. These include encrypted data transmission (TLS/HTTPS), access controls, and regular security reviews.

No method of transmission over the internet is 100% secure. In the event of a data breach that affects your rights and freedoms, we will notify affected users and the California Attorney General as required by Cal. Civ. Code § 1798.29 and § 1798.82.`
          },
          {
            title: '10. Children\'s Privacy',
            body: `CAGovNews.com is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13 without parental consent, we will delete that information immediately.`
          },
          {
            title: '11. Changes to This Policy',
            body: `We may update this Privacy Policy from time to time to reflect changes in our practices or applicable law. We will post the updated policy on this page with a revised "Last updated" date. For material changes, we will notify subscribers by email at least 14 days before the change takes effect.

Your continued use of CAGovNews.com after any changes constitutes your acceptance of the updated policy.`
          },
          {
            title: '12. Contact Us',
            body: `For privacy-related questions, requests, or complaints:

Email: privacy@cagovnews.com
Mailing address: CAGovNews.com, Privacy Officer, California, USA

California residents may also file a complaint with the California Privacy Protection Agency (CPPA) at cppa.ca.gov.`
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1b3a6b', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #e5e7eb', fontFamily: "'Source Serif 4', Georgia, serif" }}>{section.title}</h2>
            <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{section.body}</div>
          </div>
        ))}

        {/* ── Unsubscribe section ── */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '28px', marginTop: 16 }} id="unsubscribe">
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1b3a6b', marginBottom: 6, fontFamily: "'Source Serif 4', Georgia, serif" }}>📭 Unsubscribe from CAGovNews</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>
            Enter your email address below to unsubscribe from all CAGovNews email digests.
            You will receive a confirmation email and will be removed from all mailing lists within 24 hours.
          </p>

          {unsubDone ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>✅</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#166534', marginBottom: 4 }}>Unsubscribe request received</div>
                <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
                  We&apos;ve received your unsubscribe request for <strong>{unsubEmail}</strong>.
                  You will be removed from all CAGovNews mailing lists within 24 hours and will receive a confirmation email shortly.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <input
                  type="email"
                  value={unsubEmail}
                  onChange={e => { setUnsubEmail(e.target.value); if (unsubError) setUnsubError('') }}
                  placeholder="Enter your email address"
                  onKeyDown={e => e.key === 'Enter' && handleUnsub()}
                  style={{ width: '100%', fontSize: 14, padding: '10px 13px', border: `1px solid ${unsubError ? '#dc2626' : '#d1d5db'}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box', background: unsubError ? '#fff5f5' : '#fff' }}
                />
                {unsubError && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>⚠ {unsubError}</div>}
              </div>
              <button
                onClick={handleUnsub}
                style={{ height: 42, padding: '0 20px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, background: '#dc2626', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Unsubscribe
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <div style={{ background: '#1b3a6b', borderTop: '3px solid #f5a623', padding: '16px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ color: '#93c5fd', fontSize: 11 }}>© 2026 CAGovNews.com · Not affiliated with the State of California</span>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="/privacy" style={{ color: '#93c5fd', fontSize: 11, textDecoration: 'none' }}>Privacy Policy</a>
            <span style={{ color: '#93c5fd', fontSize: 11, cursor: 'pointer' }}>Contact</span>
            <span style={{ color: '#93c5fd', fontSize: 11, cursor: 'pointer' }}>RSS</span>
          </div>
        </div>
      </div>
    </div>
  )
}
