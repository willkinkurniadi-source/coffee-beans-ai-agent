import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { generateContentPlan } from "../agents/contentAgent.js";
import { parseCsv, stringifyCsv } from "../lib/csv.js";
import { normalizeContent } from "../schemas/records.js";
import { getPublishingConnectorStatus, publishContent } from "../connectors/publishingClient.js";
import { generateOpenAIDesignAsset } from "../connectors/openaiDesignClient.js";
import { loadState } from "./stateService.js";
import {
  createAirtableDataRecord,
  readAirtableRecords,
  shouldUseAirtableWrites,
  updateAirtableDataRecord
} from "./airtableRecordService.js";

const contentHeaders = [
  "content_id",
  "date",
  "channel",
  "content_type",
  "objective",
  "product_focus",
  "brief",
  "hook",
  "caption_draft",
  "script_draft",
  "cta",
  "visual_brief",
  "design_prompt",
  "design_status",
  "design_message",
  "image_url",
  "status",
  "url",
  "publish_status",
  "publish_message",
  "published_at",
  "owner",
  "created_at",
  "updated_at"
];

const contentPath = join(process.cwd(), "data", "content_calendar.csv");
let writeQueue = Promise.resolve();

export async function listContentQueue() {
  const records = await readContentRecords();
  return records
    .map(normalizeContentRecord)
    .filter((item) => ["draft", "needs_approval", "approved", "exported_to_canva", "scheduled"].includes(item.status))
    .sort(sortContentQueue);
}

export async function draftDailyContent({ limit = 4, brandVoice } = {}) {
  const state = await loadState();
  const existing = await readContentRecords();
  const today = new Date().toISOString().slice(0, 10);
  const existingKeys = new Set(existing.map((item) => `${item.date}:${item.channel}:${item.content_type}:${item.product_focus}`));
  const plan = generateContentPlan(state.stock || [], brandVoice || "Premium Indonesian specialty coffee roastery. Sophisticated, minimal, confident. Tone: luxury brand meets professional roastery. Real. Natural. Premium.");
  const now = new Date().toISOString();
  const drafts = [];

  for (const item of plan.content_items || []) {
    if (drafts.length >= limit) break;
    const key = `${today}:${item.channel}:${item.content_type}:${item.product_focus}`;
    if (existingKeys.has(key)) continue;
    drafts.push({
      content_id: `C-${Date.now()}-${String(drafts.length + 1).padStart(2, "0")}`,
      date: today,
      channel: item.channel,
      content_type: item.content_type,
      objective: item.objective,
      product_focus: item.product_focus,
      brief: item.hook,
      hook: item.hook,
      caption_draft: item.caption,
      script_draft: item.script || "",
      cta: item.cta,
      visual_brief: item.visual_brief || "",
      status: "needs_approval",
      url: "",
      owner: item.channel === "WhatsApp" ? "sales" : "marketing",
      created_at: now,
      updated_at: now
    });
  }

  let savedDrafts = drafts;
  if (drafts.length) {
    const written = await writeContentRecords([...existing, ...drafts]);
    if (Array.isArray(written) && written.length >= drafts.length) savedDrafts = written.slice(-drafts.length);
  }
  return savedDrafts.map(normalizeContentRecord);
}

export async function updateContentStatus({ content_id, status, url = "" }) {
  const records = await readContentRecords();
  const now = new Date().toISOString();
  let updated = null;

  const nextRecords = records.map((record) => {
    if (record.content_id !== content_id) return record;
    updated = {
      ...record,
      status,
      url: url || record.url || record.published_url || "",
      updated_at: now
    };
    return updated;
  });

  if (!updated) throw new Error(`Content not found: ${content_id}`);
  await writeContentRecords(nextRecords);
  return normalizeContentRecord(updated);
}

export async function publishContentDraft({ content_id }) {
  const records = await readContentRecords();
  const now = new Date().toISOString();
  const target = normalizeContentRecord(records.find((record) => record.content_id === content_id));
  if (!target.content_id) throw new Error(`Content not found: ${content_id}`);

  if (!["approved", "scheduled", "published"].includes(target.status)) {
    const result = {
      published: false,
      status: "blocked",
      message: "Content harus approved/scheduled sebelum publish.",
      url: target.url || ""
    };
    const content = await applyPublishResult(records, content_id, result, now);
    return { content, result };
  }

  const result = await publishContent(target);
  const content = await applyPublishResult(records, content_id, result, now);
  return { content, result };
}

export async function exportContentToCanva({ content_id, canva_url = "" }) {
  const records = await readContentRecords();
  const now = new Date().toISOString();
  const url = canva_url || process.env.CANVA_CONTENT_QUEUE_URL || "";
  let updated = null;

  const nextRecords = records.map((record) => {
    if (record.content_id !== content_id) return record;
    updated = {
      ...record,
      status: "exported_to_canva",
      url: url || record.url || "",
      publish_status: "canva_workflow",
      publish_message: "Asset/caption siap dipindahkan ke Canva Content Planner untuk schedule Instagram/TikTok.",
      updated_at: now
    };
    return updated;
  });

  if (!updated) throw new Error(`Content not found: ${content_id}`);
  await writeContentRecords(nextRecords);
  return normalizeContentRecord(updated);
}

export async function generateContentDesign({ content_id }) {
  const records = await readContentRecords();
  const now = new Date().toISOString();
  const target = normalizeContentRecord(records.find((record) => record.content_id === content_id));
  if (!target.content_id) throw new Error(`Content not found: ${content_id}`);

  const result = await generateOpenAIDesignAsset(target);
  let updated = null;
  const nextRecords = records.map((record) => {
    if (record.content_id !== content_id) return record;
    updated = {
      ...record,
      visual_brief: record.visual_brief || target.visual_brief || "",
      design_prompt: result.design_prompt,
      design_status: result.status,
      design_message: result.message,
      image_url: result.image_url || record.image_url || "",
      url: result.image_url || record.url || "",
      updated_at: now
    };
    return updated;
  });

  await writeContentRecords(nextRecords);
  return { content: normalizeContentRecord(updated), result };
}

export function getContentPublishingStatus() {
  return {
    connectors: getPublishingConnectorStatus(),
    canva: getCanvaWorkflowStatus()
  };
}

export function getCanvaWorkflowStatus() {
  const enabled = String(process.env.CANVA_WORKFLOW_ENABLED || "").toLowerCase() === "true";
  const queueUrl = process.env.CANVA_CONTENT_QUEUE_URL || "";
  return {
    enabled,
    queue_url: queueUrl,
    status: enabled ? (queueUrl ? "ready" : "needs_queue_url") : "disabled",
    message: enabled
      ? queueUrl
        ? "Canva workflow aktif dan queue/folder URL tersedia."
        : "Canva workflow aktif, tapi CANVA_CONTENT_QUEUE_URL belum diisi."
      : "Canva workflow belum aktif."
  };
}

export async function updateContentDraft({
  content_id,
  hook,
  caption_draft,
  script_draft,
  cta,
  visual_brief,
  objective,
  product_focus,
  status
}) {
  const records = await readContentRecords();
  const now = new Date().toISOString();
  let updated = null;

  const nextRecords = records.map((record) => {
    if (record.content_id !== content_id) return record;
    updated = {
      ...record,
      objective: objective ?? record.objective ?? "",
      product_focus: product_focus ?? record.product_focus ?? "",
      brief: hook ?? record.brief ?? "",
      hook: hook ?? record.hook ?? record.brief ?? "",
      caption_draft: caption_draft ?? record.caption_draft ?? "",
      script_draft: script_draft ?? record.script_draft ?? "",
      cta: cta ?? record.cta ?? "",
      visual_brief: visual_brief ?? record.visual_brief ?? "",
      design_prompt: record.design_prompt || "",
      design_status: record.design_status || "",
      design_message: record.design_message || "",
      image_url: record.image_url || "",
      status: status || record.status || "draft",
      publish_status: record.publish_status || "",
      publish_message: record.publish_message || "",
      published_at: record.published_at || "",
      updated_at: now
    };
    return updated;
  });

  if (!updated) throw new Error(`Content not found: ${content_id}`);
  await writeContentRecords(nextRecords);
  return normalizeContentRecord(updated);
}

async function applyPublishResult(records, contentId, result, now) {
  let updated = null;
  const nextRecords = records.map((record) => {
    if (record.content_id !== contentId) return record;
    updated = {
      ...record,
      status: result.published ? "published" : record.status || "approved",
      url: result.url || record.url || "",
      publish_status: result.status,
      publish_message: result.message,
      published_at: result.published ? now : record.published_at || "",
      updated_at: now
    };
    return updated;
  });

  await writeContentRecords(nextRecords);
  return normalizeContentRecord(updated);
}

async function readContentRecords() {
  if (shouldUseAirtableWrites()) {
    try {
      const records = await readAirtableRecords("contentCalendar");
      if (records) return records.map(normalizeContentRecord);
    } catch (error) {
      console.warn(`Airtable content read failed, using CSV fallback: ${error.message}`);
    }
  }

  try {
    const text = await readFile(contentPath, "utf8");
    return parseCsv(text);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeContentRecords(records) {
  if (shouldUseAirtableWrites()) {
    try {
      const written = [];
      for (const record of records) {
        if (record.airtable_record_id || String(record.content_id || "").startsWith("rec")) {
          written.push(await updateAirtableDataRecord("contentCalendar", record, record));
        } else {
          written.push(await createAirtableDataRecord("contentCalendar", record));
        }
      }
      return written;
    } catch (error) {
      console.warn(`Airtable content write failed, using CSV fallback: ${error.message}`);
    }
  }

  writeQueue = writeQueue.then(() => writeFile(contentPath, stringifyCsv(records, contentHeaders), "utf8"));
  await writeQueue;
  return records;
}

function normalizeContentRecord(record = {}) {
  const normalized = normalizeContent(record);
  return {
    ...normalized,
    hook: record.hook || record.brief || "",
    cta: normalized.cta || record.cta || "",
    visual_brief: normalized.visual_brief || record.visual_brief || "",
    design_prompt: record.design_prompt || "",
    design_status: normalized.design_status || record.design_status || "",
    design_message: record.design_message || "",
    image_url: normalized.image_url || record.image_url || "",
    publish_status: normalized.publish_status || record.publish_status || "",
    publish_message: normalized.publish_message || record.publish_message || "",
    published_at: normalized.published_at || record.published_at || "",
    created_at: record.created_at || "",
    updated_at: record.updated_at || ""
  };
}

function sortContentQueue(a, b) {
  const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
  if (dateCompare !== 0) return dateCompare;

  const completeCompare = completenessScore(b) - completenessScore(a);
  if (completeCompare !== 0) return completeCompare;

  const statusCompare = statusWeight(a.status) - statusWeight(b.status);
  if (statusCompare !== 0) return statusCompare;

  return String(a.channel || "").localeCompare(String(b.channel || ""));
}

function completenessScore(item) {
  return [item.hook, item.caption_draft, item.cta, item.script_draft].filter(Boolean).length;
}

function statusWeight(status) {
  return { needs_approval: 1, approved: 2, exported_to_canva: 3, scheduled: 4, draft: 5 }[status] || 9;
}
