# Coffee Beans AI Agent

Scaffold aplikasi untuk sales, marketing, invoice, dan packing coffee beans B2B cafe.

## Jalankan

```bash
cd /Users/willkin/Documents/Codex/2026-05-30/buat-ai-agent-yang-bisa-mulai/outputs/coffee-agent-app
cp .env.example .env
npm start
```

Kalau `npm` belum tersedia, jalankan langsung:

```bash
node src/server.js
```

Buka:

```text
http://localhost:8787
```

## Yang Sudah Ada

- Data schema/normalization layer untuk Products, Stock, Leads, Outreach Log, Orders, Packaging, Content Calendar, dan Daily Brief.
- Lead scoring cafe.
- Matching stock ke prospek cafe.
- Generate offer harian.
- Draft konten harian.
- Draft invoice.
- Packing queue.
- Connector placeholder untuk OpenAI, WhatsApp, scraper, dan invoice.

## Connect API Nanti

Isi `.env`:

```bash
OPENAI_API_KEY=...
WHATSAPP_API_URL=...
WHATSAPP_API_TOKEN=...
SCRAPER_API_URL=...
SCRAPER_API_TOKEN=...
```

Lalu ubah connector di:

- `src/connectors/openaiClient.js`
- `src/connectors/whatsappClient.js`
- `src/connectors/scraperClient.js`

Panduan titik sambung: `docs/API_CONNECTIONS.md`.

## Endpoint Utama

```text
GET  /api/health
GET  /api/state
GET  /api/airtable/status
GET  /api/outreach/queue
GET  /api/whatsapp/guardrails
POST /api/run/daily
POST /api/daily-brief/generate
POST /api/outreach/draft
POST /api/outreach/approve
POST /api/outreach/reject
POST /api/outreach/send
POST /api/leads/score
POST /api/offers/generate
POST /api/content/generate
POST /api/marketing/plan
POST /api/pipeline/plan
POST /api/procurement/plan
POST /api/invoices/draft
POST /api/packing/create
```

## Data

Data contoh ada di folder `data`.

- `products.csv`
- `stock.csv`
- `leads.csv`
- `outreach_log.csv`
- `orders.csv`
- `packaging.csv`
- `content_calendar.csv`
- `daily_briefs.csv`

Kontrak data app ada di:

```text
docs/DATA_MODEL.md
src/schemas
```

Semua data dari CSV/Airtable/API akan dinormalisasi dulu sebelum dipakai agent.

Mode data:

```bash
DATA_SOURCE=auto      # pakai Airtable jika configured dan ready, fallback ke CSV
DATA_SOURCE=csv       # paksa CSV lokal
DATA_SOURCE=airtable  # paksa Airtable
```
