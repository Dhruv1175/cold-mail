# Cold-Mail Engine

A zero-cost B2B lead generation and outreach automation pipeline built with TypeScript. Scrapes high-intent signals, validates domain deliverability, generates AI-personalized cold emails, evaluates quality, and sends via email API — all on free tiers.

> Built as a portfolio project demonstrating full-stack TypeScript, browser automation, LLM integration, and email deliverability infrastructure.

---

## What It Does

1. **Discovers leads** — Puppeteer scrapes Y Combinator companies, extracts company name, website, and founder signal
2. **Validates deliverability** — DNS checks for SPF and DMARC records before any email is sent
3. **Generates emails** — Groq (Llama 3 70B) writes a personalized cold email per lead based on the signal
4. **Evaluates quality** — A second AI pass scores each draft on 5 criteria (personalisation, clarity, CTA, length, tone) and returns actionable feedback
5. **Sends** — Resend delivers the email; lead status updates in the dashboard

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Database | PostgreSQL via Supabase + Prisma ORM |
| Scraping | Puppeteer (headless Chromium) |
| AI | Groq API — `llama3-70b-8192` |
| Email delivery | Resend |
| DNS validation | Node.js `dns/promises` |
| Deployment target | Vercel (frontend) + Supabase (DB) |

**Monthly cost: $0.** All services run on free tiers.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Next.js App Router              │
│  page.tsx (dashboard)  │  Server Actions         │
└────────────┬───────────┴──────────┬──────────────┘
             │                      │
     ┌───────▼──────┐      ┌────────▼────────┐
     │  Scraper API  │      │  Manual Lead    │
     │  /api/scrape  │      │  Entry Form     │
     └───────┬───────┘      └────────┬────────┘
             │                       │
     ┌───────▼───────────────────────▼────────┐
     │              Services                   │
     │  scraper.ts → ai-generator.ts           │
     │           → email-evaluator.ts          │
     │           → dns-check.ts                │
     └───────────────────┬────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   PostgreSQL (Prisma)│
              │   Lead + Evaluation  │
              └─────────────────────┘
```

---

## Features

### Automated Scraping
- Puppeteer navigates YC's company directory, visits each detail page, and extracts the real company website (filtering out YC/Startup School internal links)
- Founder name extraction with fallback
- Upserts to DB — safe to re-run without duplicates

### Domain Deliverability Validation
- Strips protocol, `www`, path, and query params from any URL
- Checks for SPF (`v=spf1`) and DMARC (`v=DMARC1`) TXT records via DNS
- Results stored as JSON on the `Lead` model; displayed in dashboard with color coding

### AI Email Generation
- Prompt: prospect name + company + title + signal → short cold email (≤150 words)
- Model: `llama3-70b-8192` via Groq

### AI Email Evaluation
- Separate evaluator prompt scores each draft across 5 criteria (0–20 each, max 100)
- Returns structured JSON: per-criteria scores + improvement feedback
- Score displayed in the dashboard; used as a quality gate for bulk send (roadmap)

### Dashboard
- Server-rendered table: company, email preview (100 chars), status, SPF/DMARC health, quality score
- Manual lead entry form
- One-click send per lead

### Notification Webhook
- After a scrape run completes, `/api/notify` fires a Resend email summarising results

---

## Project Structure

```
├── app/
│   ├── page.tsx                  # Dashboard (server component)
│   ├── actions/
│   │   ├── lead.ts               # createLead server action
│   │   └── send-email.ts         # sendEmailAction (Resend)
│   └── api/
│       ├── scrape/route.ts       # GET → trigger scraper
│       └── notify/route.ts       # POST → send completion email
├── services/
│   ├── scraper.ts                # Puppeteer YC scraping logic
│   ├── ai-generator.ts           # Groq email generation
│   └── email-evaluator.ts        # Groq email scoring
├── lib/
│   ├── prisma.ts                 # Prisma singleton (Prisma 7)
│   ├── dns-check.ts              # SPF/DMARC validation
│   └── utils.ts                  # cleanDomain helper
└── prisma/
    └── schema.prisma
```

---

## Database Schema

```prisma
model Lead {
  id              String      @id @default(cuid())
  createdAt       DateTime    @default(now())
  companyName     String
  website         String      @unique   // cleaned domain
  prospectName    String
  prospectEmail   String?
  title           String
  signal          String
  emailDraft      String?
  status          LeadStatus  @default(DISCOVERED)
  deliverability  Json        // { hasSPF: boolean, hasDMARC: boolean }
  evaluations     Evaluation[]
}

model Evaluation {
  id        String   @id @default(cuid())
  leadId    String
  score     Int      // 0–100
  criteria  Json     // { personalisation, clarity, cta, length, tone } each 0–20
  feedback  String
  createdAt DateTime @default(now())
  lead      Lead     @relation(fields: [leadId], references: [id])
}

enum LeadStatus {
  DISCOVERED
  RESEARCHED
  DRAFTED
  FAILED
}
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (free tier)
- Groq API key (free at [console.groq.com](https://console.groq.com))
- Resend API key (free at [resend.com](https://resend.com))

### Installation

```bash
git clone https://github.com/your-username/cold-mail-engine
cd cold-mail-engine
npm install
```

### Environment Variables

Create `.env.local`:

```env
DATABASE_URL="postgresql://..."          # Supabase direct connection string
GROQ_API_KEY="gsk_..."
RESEND_API_KEY="re_..."
NOTIFY_EMAIL="you@yourdomain.com"        # Where scrape-completion emails go
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### Database Setup

```bash
npx prisma generate
npx prisma db push
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

### Manual Lead Entry
Fill in the form on the dashboard. On submit, the pipeline runs: DNS check → email generation → evaluation → stored in DB.

### Scraper
Trigger via the API route:

```bash
curl http://localhost:3000/api/scrape
```

Scrapes 10 YC companies, runs the full pipeline for each, then fires a notification email.

---

## Service Limits (Free Tiers)

| Service | Limit |
|---|---|
| Groq | 30 req/min · 14,400 req/day · 500K tokens/day |
| Resend | 3,000 emails/month |
| Supabase | 500 MB storage · IPv6 direct connection |

The scraper makes ~20 Groq calls per run (10 generation + 10 evaluation) — well within the 30 req/min limit.

---

## Known Limitations

- **No email enrichment** — the scraper doesn't collect prospect emails. Manual entry requires you to supply `prospectEmail`; the scraper falls back to a test address. A Hunter.io or Clearbit free-tier integration would solve this.
- **Founder extraction is unreliable** — YC detail pages vary; the selector often falls back to `"Founder"` as the name.
- **No cron scheduling** — the GitHub Actions workflow is included in the repo but is blocked by Supabase's IPv6-only free tier (GitHub Actions runners are IPv4). Switch to [Neon](https://neon.tech) (free, IPv4) to enable scheduled runs.
- **No authentication** — the dashboard is public. Acceptable for a portfolio demo; add NextAuth or Clerk before any real deployment.

---

## Roadmap

- [ ] **Inbox health monitor** — Resend webhooks to track opens, clicks, bounces
- [ ] **Email enrichment** — Hunter.io / Clearbit free tier to find prospect emails for scraped leads
- [ ] **Bulk send** — send to all leads with quality score > 70
- [ ] **Authentication** — protect the dashboard with NextAuth
- [ ] **Vercel + Neon deployment** — IPv4-compatible DB to re-enable GitHub Actions cron
- [ ] **n8n integration** — external workflow orchestration for follow-up sequences

---

## Design Decisions

**Why Puppeteer over a static fetcher?** YC's company listing requires JavaScript rendering. A `fetch`-based scraper would need a separate HTML parser and still miss dynamically loaded content. Puppeteer is also a deliberate signal of browser automation skill.

**Why Groq over OpenAI?** Groq's free tier is generous (500K tokens/day) with no credit card required. The latency is lower than OpenAI on comparable models, and `llama3-70b-8192` produces email quality sufficient for a portfolio demo.

**Why two separate AI calls (generate + evaluate)?** A single prompt asking the model to generate and self-score in one shot produces inflated scores. Splitting generation and evaluation into independent calls gives more honest quality signals — the evaluator doesn't know it wrote the email.

**Why Supabase over PlanetScale/Neon?** Familiarity and the Prisma integration. The IPv6 limitation is a known trade-off; documented in Known Limitations above.

---

## License

MIT