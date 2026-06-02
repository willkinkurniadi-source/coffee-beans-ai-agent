# Airtable Setup

## 1. Buat Base

Nama base:

```text
WILLKIN Growth OS
```

## 2. Buat Tables MVP

Gunakan nama table berikut agar cocok dengan `.env.example`:

- Products
- Stock
- Leads
- Outreach Log
- Orders
- Packaging
- Content Calendar
- Daily Brief

## 3. Isi Env

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

## 4. Field Names

App normalizer mendukung field Indonesia dan Inggris. Field minimal:

### Products

- `sku`
- `nama_produk` or `name`
- `jenis` or `category`
- `origin_or_blend`
- `roast_level`
- `flavor_notes`
- `pack_size_gram`
- `harga_cafe_per_kg` or `price_cafe`
- `harga_retail_per_kg` or `price_retail`
- `minimum_order_kg`

### Stock

- `sku`
- `nama_produk`
- `quantity_kg`
- `priority_to_sell`
- `roast_date`
- `best_before`
- `hpp_per_kg`

### Leads

- `lead_id`
- `nama_cafe` or `cafe_name`
- `kota` or `city`
- `area`
- `instagram`
- `phone` or `wa_number`
- `segment`
- `has_espresso`
- `lead_score` or `score`
- `status`
- `next_followup_date`
- `no_contact`

### Outreach Log

- `outreach_id`
- `lead_id`
- `message_type`
- `channel`
- `message_draft`
- `status`
- `approved_by`
- `sent_at`
- `reply_text`
- `intent_classification`
- `next_followup_date`

### Orders

- `order_id`
- `customer_name`
- `lead_id`
- `sku`
- `nama_produk`
- `quantity_kg`
- `unit_price`
- `discount`
- `shipping_fee`
- `tax` or `ppn`
- `total`
- `status`
- `order_date`

### Packaging

- `item_id`
- `item_name`
- `variant`
- `stock_qty`
- `reorder_point`
- `usage_per_order`
- `lead_time_days`
- `supplier`
- `status`

### Content Calendar

- `content_id`
- `date`
- `platform` or `channel`
- `content_type`
- `objective`
- `product_focus`
- `brief`
- `caption_draft`
- `script_draft`
- `status`
- `published_url`

### Daily Brief

- `date`
- `priority_product`
- `priority_lead_ids`
- `revenue_today`
- `stock_alerts`
- `content_tasks`
- `outreach_tasks`
- `tomorrow_focus`
- `owner_summary`

## 5. Test

Start server, lalu cek:

```bash
curl http://127.0.0.1:8787/api/airtable/status
curl http://127.0.0.1:8787/api/state
```

Jika Airtable belum lengkap, `DATA_SOURCE=auto` fallback ke CSV.

