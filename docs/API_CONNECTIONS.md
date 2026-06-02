# API Connection Guide

File ini menjelaskan bagian yang perlu kamu connect ketika sudah punya API key/provider.

## 1. OpenAI

Isi `.env`:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.4
```

Connector:

```text
src/connectors/openaiClient.js
```

Fungsi:

```js
callOpenAI({ system, user, jsonSchema })
```

Rekomendasi penggunaan:
- Pakai AI untuk personalisasi pesan sales.
- Pakai AI untuk variasi caption/konten.
- Pakai AI untuk merangkum hasil scraping cafe.
- Tetap pakai rule lokal untuk stock, harga, invoice, dan approval.

## 2. Scraper Cafe

Isi `.env`:

```bash
SCRAPER_API_URL=https://provider-kamu.com/api/search-cafes
SCRAPER_API_TOKEN=...
```

Connector:

```text
src/connectors/scraperClient.js
```

Expected output:

```json
{
  "leads": [
    {
      "lead_id": "L-123",
      "nama_cafe": "Nama Cafe",
      "kota": "Jakarta",
      "area": "Senopati",
      "instagram": "https://instagram.com/...",
      "phone": "628...",
      "segment": "coffee shop",
      "has_espresso": "yes",
      "fit_notes": "menu espresso terlihat"
    }
  ]
}
```

## 3. WhatsApp

Isi `.env`:

```bash
WHATSAPP_API_URL=https://provider-kamu.com/api/messages
WHATSAPP_API_TOKEN=...
WHATSAPP_DAILY_CAP=50
```

Connector:

```text
src/connectors/whatsappClient.js
```

Fungsi:

```js
sendWhatsAppMessage({ to, message })
```

Catatan:
- Jangan langsung blast semua leads.
- Tambahkan approval manusia sebelum kirim batch pertama.
- Simpan status sent/replied/blocked ke database.
- `POST /api/outreach/send` selalu melewati guardrail approval, daily cap, no-contact, dan contact readiness.

## 4. Invoice

Saat ini invoice masih draft JSON dari:

```text
src/agents/invoiceAgent.js
```

Yang perlu ditambahkan nanti:
- Nomor invoice dari sistem accounting.
- PDF generator.
- Status payment.
- Integrasi payment/accounting.

## 5. Produksi & Packing

Packing queue dibuat dari order `approved` atau `paid`:

```text
src/agents/packingAgent.js
```

Yang perlu ditambahkan nanti:
- Kirim packing note ke WhatsApp/Slack/Telegram produksi.
- Print label.
- Update resi.
- Kurangi stock otomatis setelah order shipped.

## 6. Database

MVP sekarang memakai CSV di folder `data`.

Upgrade berikutnya:
- Google Sheets untuk cepat.
- Airtable untuk workflow sederhana.
- Supabase/Postgres untuk aplikasi serius.

Service yang membaca data:

```text
src/services/stateService.js
```

Ganti service ini kalau kamu pindah dari CSV ke database/API.

Connector Airtable awal sudah disiapkan:

```text
src/connectors/airtableClient.js
```

Env yang perlu diisi:

```bash
AIRTABLE_API_KEY=...
AIRTABLE_BASE_ID=...
DATA_SOURCE=auto
AIRTABLE_TABLE_PRODUCTS=Products
AIRTABLE_TABLE_STOCK=Stock
AIRTABLE_TABLE_LEADS=Leads
AIRTABLE_TABLE_OUTREACH_LOG=Outreach Log
AIRTABLE_TABLE_ORDERS=Orders
AIRTABLE_TABLE_PACKAGING=Packaging
AIRTABLE_TABLE_CONTENT_CALENDAR=Content Calendar
AIRTABLE_TABLE_DAILY_BRIEFS=Daily Brief
```

Endpoint cek koneksi:

```text
GET /api/airtable/status
```

Table MVP yang disarankan:
- Products
- Stock
- Leads
- Outreach Log
- Orders
- Packaging
- Content Calendar
- Daily Brief

`DATA_SOURCE=auto` akan memakai Airtable jika env lengkap dan table minimal ready. Kalau belum, app otomatis fallback ke CSV lokal.
