# WILLKIN Growth OS Data Model

This is the app-level data contract. CSV, Airtable, scraper APIs, and future databases should map into these records.

## Core Tables

### Products

Required:
- `sku`
- `name` / `nama_produk`
- `category` / `jenis`
- `price_cafe` / `harga_cafe_per_kg`
- `price_retail` / `harga_retail_per_kg`

### Stock

Required:
- `sku`
- `nama_produk`
- `quantity_kg`
- `priority_to_sell`

Optional:
- `quantity_pack`
- `stock_green_kg`
- `roast_date`
- `best_before`
- `hpp_per_kg`

### Leads

Required:
- `lead_id`
- `cafe_name` / `nama_cafe`
- `city` / `kota`
- `status`

Important:
- `wa_number` / `phone`
- `instagram`
- `google_maps_url`
- `segment`
- `lead_score`
- `recommended_product`
- `no_contact`

### Outreach Log

Required:
- `outreach_id`
- `lead_id`
- `message_draft`
- `status`

Statuses:
- `draft`
- `needs_approval`
- `approved`
- `sent`
- `replied`
- `stopped`

### Orders

Required:
- `order_id`
- `sku`
- `quantity_kg`
- `unit_price`
- `status`

Statuses:
- `draft`
- `approved`
- `paid`
- `packing`
- `shipped`
- `delivered`
- `cancelled`

### Content Calendar

Required:
- `content_id`
- `date`
- `platform` / `channel`
- `content_type`
- `product_focus`
- `status`

Statuses:
- `draft`
- `needs_approval`
- `approved`
- `scheduled`
- `published`
- `measured`

### Daily Brief

Required:
- `date`
- `priority_product`
- `owner_summary`

## Normalization

All source data is normalized in `src/schemas` before agents use it. This lets the app move from CSV to Airtable without rewriting the agent logic.

