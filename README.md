# CAGovNews.com — Backend & Crawler

California government news aggregator. Crawls 40+ ca.gov agency newsrooms daily, archives full article content, and delivers email digests to registered users.

## Stack

| Layer | Service |
|-------|---------|
| Frontend | Claude Design (React/Next.js) on Vercel |
| Database | Supabase Postgres |
| Auth | Supabase Auth |
| Email | Resend |
| Payments | Stripe |
| Crawler | GitHub Actions (daily cron) |

---

## Setup — step by step

### 1. Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste `supabase/migrations/001_initial_schema.sql` → Run
3. Go to **Settings → API** → copy:
   - Project URL → `SUPABASE_URL`
   - `anon` key → `SUPABASE_ANON_KEY` (safe for browser/Vercel)
   - `service_role` key → `SUPABASE_SERVICE_KEY` (server only — keep secret)

### 2. Resend

1. Sign up at [resend.com](https://resend.com)
2. **Domains** → Add `cagovnews.com` → add the 3 DNS records to your registrar → Verify
3. **API Keys** → Create → copy key → `RESEND_API_KEY`

### 3. Stripe

1. Dashboard at [stripe.com](https://stripe.com)
2. **Products** → Create a product (e.g. "CAGovNews Pro", $9/month)
3. **Developers → API Keys** → copy publishable + secret keys
4. **Developers → Webhooks** → Add endpoint:
   - URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`

### 4. GitHub Secrets

In your GitHub repo → **Settings → Secrets → Actions**, add:

```
SUPABASE_URL
SUPABASE_SERVICE_KEY
RESEND_API_KEY
ADMIN_EMAIL        (your email for failure alerts)
```

### 5. Vercel

1. Connect this GitHub repo to Vercel
2. **Settings → Environment Variables**, add:
```
SUPABASE_URL
SUPABASE_ANON_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
NEXT_PUBLIC_APP_URL=https://cagovnews.com
```
3. **Settings → Domains** → add `cagovnews.com`

### 6. Supabase Edge Functions

Deploy the two Edge Functions:
```bash
npx supabase functions deploy send-digest
npx supabase functions deploy stripe-webhook
```

Set secrets on the Edge Functions:
```bash
npx supabase secrets set RESEND_API_KEY=re_your_key
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_your_key
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_key
npx supabase secrets set APP_URL=https://cagovnews.com
```

---

## Running the crawler

```bash
# Install
npm install

# Copy env file and fill in values
cp .env.example .env

# Crawl all agencies
npm run crawl

# Crawl one agency (for testing)
AGENCY_FILTER=DMV npm run crawl

# Dry run — scrape but don't write to DB
npm run crawl:dry
```

The GitHub Actions workflow runs automatically at 6 AM Pacific every day.
You can also trigger it manually from **Actions → Daily CA.gov News Crawler → Run workflow**.

---

## Project structure

```
cagovnews/
├── crawler.js                          # Main crawler script
├── package.json
├── .env.example                        # Copy to .env — never commit .env
├── .gitignore
├── .github/
│   └── workflows/
│       └── daily-crawl.yml             # GitHub Actions cron job
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql      # Run once in Supabase SQL Editor
    └── functions/
        ├── send-digest/
        │   └── index.ts                # Email digest (called by crawler)
        └── stripe-webhook/
            └── index.ts                # Stripe payment events
```

---

## Database tables

| Table | Purpose |
|-------|---------|
| `agencies` | Agency registry (slug, name, news URL, color) |
| `releases` | Structured release metadata (title, date, tag, URL) |
| `release_content` | Full archived content (HTML, text, markdown) |
| `profiles` | User profiles extended from Supabase Auth |
| `subscriptions` | Stripe subscription tracking |
| `email_log` | Email send history |
| `crawl_log` | Daily crawl run history |
