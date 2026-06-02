import {
  createAirtableRecord,
  fetchAirtableTable,
  isAirtableConfigured,
  updateAirtableRecord
} from "../connectors/airtableClient.js";
import { getAirtableTableNames } from "./airtableStateService.js";

export function shouldUseAirtableWrites() {
  return isAirtableConfigured() && (process.env.DATA_SOURCE || "auto") !== "csv";
}

export async function readAirtableRecords(collection) {
  if (!shouldUseAirtableWrites()) return null;
  const tableName = getAirtableTableNames()[collection];
  if (!tableName) return null;
  const result = await fetchAirtableTable(tableName);
  return result.records || [];
}

export async function createAirtableDataRecord(collection, record) {
  if (!shouldUseAirtableWrites()) return null;
  const tableName = getAirtableTableNames()[collection];
  const fields = toAirtableFields(collection, record);
  const created = await createAirtableRecord(tableName, fields, { typecast: true });
  return {
    airtable_record_id: created.id,
    ...(created.fields || {})
  };
}

export async function updateAirtableDataRecord(collection, record, updates) {
  if (!shouldUseAirtableWrites()) return null;
  const tableName = getAirtableTableNames()[collection];
  const recordId = record.airtable_record_id || record.content_id || record.outreach_id || record.order_id || record.lead_id;
  if (!String(recordId || "").startsWith("rec")) {
    throw new Error(`Airtable record id belum tersedia untuk ${collection}.`);
  }

  const fields = toAirtableFields(collection, { ...record, ...updates }, updates);
  const updated = await updateAirtableRecord(tableName, recordId, fields, { typecast: true });
  return {
    airtable_record_id: updated.id,
    ...(updated.fields || {})
  };
}

export function toAirtableFields(collection, record, changedFields = record) {
  if (collection === "contentCalendar") return toContentFields(record, changedFields);
  if (collection === "outreachLog") return toOutreachFields(record, changedFields);
  if (collection === "leads") return toLeadFields(record, changedFields);
  if (collection === "orders") return toOrderFields(record, changedFields);
  if (collection === "stock") return toStockFields(record, changedFields);
  return cleanFields(changedFields);
}

function toContentFields(record, changedFields) {
  return cleanFields({
    "Post Date": pick(record.date, changedFields.date),
    Platform: pick(record.channel || record.platform, changedFields.channel || changedFields.platform),
    "Content Status": toTitleStatus(pick(record.status, changedFields.status)),
    "Content Title": pick(record.hook || record.brief, changedFields.hook || changedFields.brief),
    "Content Description": pick(
      record.caption_draft || record.script_draft || record.publish_message,
      changedFields.caption_draft || changedFields.script_draft || changedFields.publish_message
    ),
    "Assigned Owner": pick(record.owner, changedFields.owner),
    "Canva Queue URL": pick(record.url, changedFields.url),
    "Publish Status": pick(record.publish_status, changedFields.publish_status),
    "Publish Message": pick(record.publish_message, changedFields.publish_message),
    "Exported At": pick(record.published_at || record.updated_at, changedFields.published_at || changedFields.updated_at),
    CTA: pick(record.cta, changedFields.cta),
    "Visual Brief": pick(record.visual_brief, changedFields.visual_brief),
    "Script Draft": pick(record.script_draft, changedFields.script_draft),
    "Image URL": pick(record.image_url, changedFields.image_url),
    "Design Status": pick(record.design_status, changedFields.design_status)
  });
}

function toOutreachFields(record, changedFields) {
  return cleanFields({
    outreach_id: pick(record.outreach_id, changedFields.outreach_id),
    lead_id: pick(record.lead_id, changedFields.lead_id),
    message_type: pick(record.message_type, changedFields.message_type),
    channel: pick(record.channel, changedFields.channel),
    message_draft: pick(record.message_draft, changedFields.message_draft),
    status: pick(record.status, changedFields.status),
    approved_by: pick(record.approved_by, changedFields.approved_by),
    sent_at: pick(record.sent_at, changedFields.sent_at),
    reply_text: pick(record.reply_text, changedFields.reply_text),
    intent_classification: pick(record.intent_classification, changedFields.intent_classification),
    next_followup_date: pick(record.next_followup_date, changedFields.next_followup_date),
    created_at: pick(record.created_at, changedFields.created_at),
    updated_at: pick(record.updated_at, changedFields.updated_at)
  });
}

function toLeadFields(record, changedFields) {
  return cleanFields({
    "Cafe Name": pick(record.cafe_name || record.nama_cafe, changedFields.cafe_name || changedFields.nama_cafe),
    Location: pick(record.city || record.kota || record.area, changedFields.city || changedFields.kota || changedFields.area),
    "Instagram Handle": pick(record.instagram || record.ig_handle, changedFields.instagram || changedFields.ig_handle),
    "Phone Number": pick(record.phone || record.wa_number, changedFields.phone || changedFields.wa_number),
    "Contact Person": pick(record.contact_name, changedFields.contact_name),
    "Lead Source": toLeadSource(pick(record.lead_source || record.source, changedFields.lead_source || changedFields.source)),
    Notes: pick(record.fit_notes, changedFields.fit_notes),
    Scoring: pick(record.lead_score || record.score, changedFields.lead_score || changedFields.score),
    "Outreach Status": toLeadOutreachStatus(pick(record.status, changedFields.status)),
    "Scraping Status": pick(record.scraping_status, changedFields.scraping_status)
  });
}

function toOrderFields(record, changedFields) {
  return cleanFields({
    "Order Number": pick(record.order_id, changedFields.order_id),
    "Order Date": pick(record.order_date, changedFields.order_date),
    Quantity: pick(record.quantity_kg || record.qty, changedFields.quantity_kg || changedFields.qty),
    "Total Order Value": pick(record.total || record.total_price, changedFields.total || changedFields.total_price),
    "Order Status": toTitleStatus(pick(record.status, changedFields.status)),
    "Order Notes": pick(record.production_notes || record.order_notes, changedFields.production_notes || changedFields.order_notes)
  });
}

function toStockFields(record, changedFields) {
  return cleanFields({
    "Inventory Name": pick(record.name || record.nama_produk || record.product_name, changedFields.name || changedFields.nama_produk || changedFields.product_name),
    Type: pick(record.category || record.jenis, changedFields.category || changedFields.jenis),
    "Current Stock": pick(record.quantity_kg || record.stock_roasted_kg, changedFields.quantity_kg || changedFields.stock_roasted_kg),
    "Stock Alert": pick(record.stock_alert, changedFields.stock_alert),
    Notes: pick(record.catatan, changedFields.catatan),
    "Stock Movement": pick(record.stock_movement, changedFields.stock_movement),
    Unit: pick(record.unit, changedFields.unit)
  });
}

function pick(value, changedValue) {
  return changedValue === undefined ? undefined : value;
}

function cleanFields(fields) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function toTitleStatus(value) {
  if (!value) return value;
  return String(value)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function toLeadSource(value) {
  if (!value) return value;
  return /scrap|outscraper|google/i.test(value) ? "Scraped" : value;
}

function toLeadOutreachStatus(value) {
  if (!value) return value;
  const normalized = String(value).toLowerCase().replace(/[\s-]+/g, "_");
  if (["new", "qualified", "draft_ready"].includes(normalized)) return "Not Contacted";
  if (["contacted", "replied", "sample_requested", "sample_sent"].includes(normalized)) return "Contacted";
  if (["trial_order", "recurring"].includes(normalized)) return "In Discussion";
  if (normalized === "dead") return "Stopped";
  return toTitleStatus(value);
}
