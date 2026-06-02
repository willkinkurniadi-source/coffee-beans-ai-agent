import { bool, compactObject, date, enumValue, money, number, text } from "./fields.js";

export const leadStatuses = [
  "new",
  "qualified",
  "draft_ready",
  "contacted",
  "replied",
  "sample_requested",
  "sample_sent",
  "trial_order",
  "recurring",
  "dead"
];

export const outreachStatuses = ["draft", "needs_approval", "approved", "sent", "replied", "stopped"];
export const contentStatuses = ["draft", "needs_approval", "approved", "exported_to_canva", "scheduled", "published", "measured"];
export const orderStatuses = ["draft", "approved", "paid", "packing", "shipped", "delivered", "cancelled"];

export function normalizeProduct(record = {}) {
  return compactObject({
    sku: text(record.sku),
    name: text(record.name || record.nama_produk || record.product_name),
    nama_produk: text(record.nama_produk || record.name || record.product_name),
    product_name: text(record.product_name || record.nama_produk || record.name),
    category: text(record.category || record.jenis || record.Type),
    jenis: text(record.jenis || record.category || record.Type),
    origin_or_blend: text(record.origin_or_blend),
    roast_level: text(record.roast_level),
    flavor_notes: text(record.flavor_notes),
    pack_size_gram: number(record.pack_size_gram),
    price_cafe: money(record.price_cafe || record.harga_cafe_per_kg),
    harga_cafe_per_kg: money(record.harga_cafe_per_kg || record.price_cafe),
    price_retail: money(record.price_retail || record.harga_retail_per_kg),
    harga_retail_per_kg: money(record.harga_retail_per_kg || record.price_retail),
    minimum_order_kg: number(record.minimum_order_kg, 1),
    priority_to_sell: text(record.priority_to_sell, "normal")
  });
}

export function normalizeStockItem(record = {}) {
  return {
    ...normalizeProduct(record),
    quantity_pack: number(record.quantity_pack),
    name: text(record.name || record.nama_produk || record.product_name || record["Inventory Name"]),
    nama_produk: text(record.nama_produk || record.name || record.product_name || record["Inventory Name"]),
    product_name: text(record.product_name || record.nama_produk || record.name || record["Inventory Name"]),
    category: text(record.category || record.jenis || record.Type),
    jenis: text(record.jenis || record.category || record.Type),
    quantity_kg: number(record.quantity_kg || record["Current Stock"]),
    stock_roasted_kg: number(record.stock_roasted_kg || record.quantity_kg || record["Current Stock"]),
    stock_green_kg: number(record.stock_green_kg),
    roast_date: date(record.roast_date),
    best_before: date(record.best_before),
    hpp_per_kg: money(record.hpp_per_kg),
    catatan: text(record.catatan || record.Notes || record["Stock Alert"] || record["Stock Movement"]),
    stock_alert: text(record.stock_alert || record["Stock Alert"])
  };
}

export function normalizeLead(record = {}) {
  const score = Math.max(0, Math.min(100, number(record.score || record.lead_score || record.Scoring, 0)));
  return compactObject({
    lead_id: text(record.lead_id || record.id || record.airtable_record_id),
    cafe_name: text(record.cafe_name || record.nama_cafe || record["Cafe Name"]),
    nama_cafe: text(record.nama_cafe || record.cafe_name || record["Cafe Name"]),
    city: text(record.city || record.kota || record.Location),
    kota: text(record.kota || record.city || record.Location),
    area: text(record.area),
    alamat: text(record.alamat || record.address),
    instagram: text(record.instagram || record.ig_handle || record["Instagram Handle"]),
    ig_handle: text(record.ig_handle || record.instagram || record["Instagram Handle"]),
    website: text(record.website),
    google_maps_url: text(record.google_maps_url || record.gmaps_url),
    gmaps_url: text(record.gmaps_url || record.google_maps_url),
    contact_name: text(record.contact_name || record["Contact Person"]),
    phone: text(record.phone || record.wa_number || record["Phone Number"]),
    wa_number: text(record.wa_number || record.phone || record["Phone Number"]),
    email: text(record.email),
    segment: text(record.segment, "unknown"),
    has_espresso: bool(record.has_espresso) ? "yes" : text(record.has_espresso, "unknown"),
    visible_supplier: text(record.visible_supplier, "unknown"),
    lead_source: text(record.lead_source || record.source || record["Lead Source"], "manual"),
    source: text(record.source || record.lead_source || record["Lead Source"], "manual"),
    last_seen_active: date(record.last_seen_active),
    fit_notes: text(record.fit_notes || record.Notes),
    lead_score: score,
    score,
    recommended_product: text(record.recommended_product),
    status: enumValue(String(record.status || record["Outreach Status"] || "").toLowerCase(), leadStatuses, "new"),
    next_action: text(record.next_action || record["Outreach Status"] || record["Trial Status"] || record["Recurring Status"]),
    next_followup_date: date(record.next_followup_date),
    no_contact: bool(record.no_contact)
  });
}

export function normalizeOutreach(record = {}) {
  return compactObject({
    airtable_record_id: text(record.airtable_record_id),
    outreach_id: text(record.outreach_id || record.id),
    lead_id: text(record.lead_id),
    message_type: text(record.message_type, "first"),
    channel: text(record.channel, "WhatsApp"),
    message_draft: text(record.message_draft || record.message),
    status: enumValue(record.status, outreachStatuses, "draft"),
    approved_by: text(record.approved_by),
    sent_at: text(record.sent_at),
    reply_text: text(record.reply_text || record.reply),
    intent_classification: text(record.intent_classification),
    next_followup_date: date(record.next_followup_date),
    created_at: text(record.created_at),
    updated_at: text(record.updated_at)
  });
}

export function normalizeOrder(record = {}) {
  return compactObject({
    order_id: text(record.order_id || record["Order Number"] || record.airtable_record_id),
    customer_name: text(record.customer_name || record["Cafe Lead"]),
    lead_id: text(record.lead_id || record["Cafe Lead"]),
    channel: text(record.channel, "manual"),
    sku: text(record.sku),
    nama_produk: text(record.nama_produk || record.product_name),
    product_name: text(record.product_name || record.nama_produk),
    quantity_kg: number(record.quantity_kg || record.qty || record.Quantity),
    qty: number(record.qty || record.quantity_kg || record.Quantity),
    unit_price: money(record.unit_price),
    discount: money(record.discount),
    shipping_fee: money(record.shipping_fee),
    tax: money(record.tax || record.ppn),
    ppn: money(record.ppn || record.tax),
    total: money(record.total || record.total_price || record["Total Order Value"]),
    total_price: money(record.total_price || record.total || record["Total Order Value"]),
    status: enumValue(String(record.status || record["Order Status"] || "").toLowerCase(), orderStatuses, "draft"),
    invoice_no: text(record.invoice_no),
    payment_due_date: date(record.payment_due_date),
    packing_status: text(record.packing_status, "pending"),
    production_notes: text(record.production_notes),
    ship_to: text(record.ship_to),
    expedition: text(record.expedition),
    tracking_no: text(record.tracking_no),
    order_date: date(record.order_date || record["Order Date"])
  });
}

export function normalizePackaging(record = {}) {
  return compactObject({
    item_id: text(record.item_id),
    item_name: text(record.item_name),
    variant: text(record.variant),
    stock_qty: number(record.stock_qty),
    reorder_point: number(record.reorder_point),
    usage_per_order: number(record.usage_per_order, 1),
    lead_time_days: number(record.lead_time_days),
    supplier: text(record.supplier),
    status: text(record.status, "watch")
  });
}

export function normalizeContent(record = {}) {
  return compactObject({
    content_id: text(record.content_id || record.airtable_record_id),
    date: date(record.date || record["Post Date"]),
    platform: text(record.platform || record.channel || record.Platform),
    channel: text(record.channel || record.platform || record.Platform),
    content_type: text(record.content_type),
    objective: text(record.objective),
    product_focus: text(record.product_focus || record["Growth Plan Name"]),
    brief: text(record.brief || record["Content Title"]),
    hook: text(record.hook || record["Content Title"]),
    caption_draft: text(record.caption_draft || record["Content Description"]),
    script_draft: text(record.script_draft || record["Script Draft"]),
    cta: text(record.cta || record.CTA),
    visual_brief: text(record.visual_brief || record["Visual Brief"]),
    design_status: text(record.design_status || record["Design Status"]),
    image_url: text(record.image_url || record["Image URL"]),
    status: enumValue(String(record.status || record["Content Status"] || "").toLowerCase(), contentStatuses, "draft"),
    url: text(record.url || record.published_url || record["Canva Queue URL"]),
    published_url: text(record.published_url || record.url),
    publish_status: text(record.publish_status || record["Publish Status"]),
    publish_message: text(record.publish_message || record["Publish Message"]),
    published_at: text(record.published_at || record["Exported At"]),
    engagement_snapshot: text(record.engagement_snapshot),
    owner: text(record.owner || record["Assigned Owner"], "marketing")
  });
}

export function normalizeDailyBrief(record = {}) {
  return compactObject({
    date: date(record.date, new Date().toISOString().slice(0, 10)),
    priority_product: text(record.priority_product),
    priority_lead_ids: text(record.priority_lead_ids),
    revenue_today: money(record.revenue_today),
    stock_alerts: text(record.stock_alerts),
    content_tasks: text(record.content_tasks),
    outreach_tasks: text(record.outreach_tasks),
    tomorrow_focus: text(record.tomorrow_focus),
    owner_summary: text(record.owner_summary)
  });
}
