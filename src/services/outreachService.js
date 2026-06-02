import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv, stringifyCsv } from "../lib/csv.js";
import { loadState } from "./stateService.js";
import { scoreLeads } from "../agents/leadScoringAgent.js";
import { generateOffers } from "../agents/offerAgent.js";
import { normalizeOutreach } from "../schemas/records.js";
import { evaluateWhatsAppGuardrail } from "./whatsappGuardrailService.js";
import { sendWhatsAppMessage } from "../connectors/whatsappClient.js";
import {
  createAirtableDataRecord,
  readAirtableRecords,
  shouldUseAirtableWrites,
  updateAirtableDataRecord
} from "./airtableRecordService.js";

const outreachHeaders = [
  "outreach_id",
  "lead_id",
  "message_type",
  "channel",
  "message_draft",
  "status",
  "approved_by",
  "sent_at",
  "reply_text",
  "intent_classification",
  "next_followup_date",
  "created_at",
  "updated_at"
];

const outreachPath = join(process.cwd(), "data", "outreach_log.csv");
let writeQueue = Promise.resolve();

export async function listOutreachQueue() {
  const records = await readOutreachRecords();
  const state = await loadState();
  return enrichOutreach(records.map(normalizeOutreach), state)
    .filter((item) => ["draft", "needs_approval", "approved"].includes(item.status))
    .sort((a, b) => statusWeight(a.status) - statusWeight(b.status));
}

export async function draftOutreach({ limit = 20 } = {}) {
  const state = await loadState();
  const leads = scoreLeads(state.leads || [], state.stock || []);
  const offers = generateOffers(state.stock || [], leads);
  const existing = await readOutreachRecords();
  const existingKeys = new Set(existing.map((item) => `${item.lead_id}:${item.message_type || "first"}`));
  const now = new Date().toISOString();
  const drafts = [];

  for (const offer of offers) {
    if (drafts.length >= limit) break;
    const key = `${offer.lead_id}:first`;
    const lead = leads.find((item) => item.lead_id === offer.lead_id);
    if (existingKeys.has(key)) continue;
    if (lead?.no_contact) continue;

    drafts.push({
      outreach_id: `OR-${Date.now()}-${String(drafts.length + 1).padStart(2, "0")}`,
      lead_id: offer.lead_id,
      message_type: "first",
      channel: lead?.wa_number || lead?.phone ? "WhatsApp" : "Needs Contact",
      message_draft: offer.message,
      status: "needs_approval",
      approved_by: "",
      sent_at: "",
      reply_text: "",
      intent_classification: "",
      next_followup_date: nextDate(3),
      created_at: now,
      updated_at: now
    });
  }

  let savedDrafts = drafts;
  if (drafts.length) {
    const written = await writeOutreachRecords([...existing, ...drafts]);
    if (Array.isArray(written) && written.length >= drafts.length) savedDrafts = written.slice(-drafts.length);
  }
  return savedDrafts.map(normalizeOutreach);
}

export async function updateOutreachStatus({ outreach_id, status, approved_by = "owner" }) {
  const records = await readOutreachRecords();
  const now = new Date().toISOString();
  let updated = null;

  const nextRecords = records.map((record) => {
    if (record.outreach_id !== outreach_id) return record;
    updated = {
      ...record,
      status,
      approved_by: status === "approved" ? approved_by : record.approved_by,
      updated_at: now
    };
    return updated;
  });

  if (!updated) throw new Error(`Outreach not found: ${outreach_id}`);
  await writeOutreachRecords(nextRecords);
  return normalizeOutreach(updated);
}

export async function sendApprovedOutreach({ outreach_id }) {
  const records = await readOutreachRecords();
  const state = await loadState();
  const outreach = normalizeOutreach(records.find((record) => record.outreach_id === outreach_id));
  if (!outreach.outreach_id) throw new Error(`Outreach not found: ${outreach_id}`);

  const guardrail = evaluateWhatsAppGuardrail({ outreach, state });
  if (!guardrail.allowed) {
    return {
      sent: false,
      outreach,
      guardrail
    };
  }

  const result = await sendWhatsAppMessage({
    to: guardrail.to,
    message: outreach.message_draft
  });

  if (result?.status === "not_sent_missing_whatsapp_api") {
    return {
      sent: false,
      result,
      guardrail: {
        ...guardrail,
        allowed: false,
        reasons: ["WhatsApp API belum dikonfigurasi."],
        warnings: guardrail.warnings
      },
      outreach
    };
  }

  const now = new Date().toISOString();
  const nextRecords = records.map((record) =>
    record.outreach_id === outreach_id
      ? {
          ...record,
          status: "sent",
          sent_at: now,
          updated_at: now
        }
      : record
  );
  await writeOutreachRecords(nextRecords);

  return {
    sent: true,
    result,
    guardrail,
    outreach: normalizeOutreach(nextRecords.find((record) => record.outreach_id === outreach_id))
  };
}

export async function getWhatsAppGuardrailReport() {
  const state = await loadState();
  const records = await readOutreachRecords();
  const queue = records.map(normalizeOutreach).filter((item) => ["draft", "needs_approval", "approved"].includes(item.status));
  const evaluations = queue.map((outreach) => evaluateWhatsAppGuardrail({ outreach, state }));
  return {
    daily_cap: Number(process.env.WHATSAPP_DAILY_CAP || 50),
    sent_today: countSentToday(records),
    whatsapp_configured: Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN),
    queue: queue.map((outreach, index) => ({
      outreach,
      guardrail: evaluations[index]
    }))
  };
}

async function readOutreachRecords() {
  if (shouldUseAirtableWrites()) {
    try {
      const records = await readAirtableRecords("outreachLog");
      if (records) return records.map(normalizeOutreach);
    } catch (error) {
      console.warn(`Airtable outreach read failed, using CSV fallback: ${error.message}`);
    }
  }

  try {
    const text = await readFile(outreachPath, "utf8");
    return parseCsv(text);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeOutreachRecords(records) {
  if (shouldUseAirtableWrites()) {
    try {
      const written = [];
      for (const record of records) {
        if (record.airtable_record_id || String(record.outreach_id || "").startsWith("rec")) {
          written.push(await updateAirtableDataRecord("outreachLog", record, record));
        } else {
          written.push(await createAirtableDataRecord("outreachLog", record));
        }
      }
      return written;
    } catch (error) {
      console.warn(`Airtable outreach write failed, using CSV fallback: ${error.message}`);
    }
  }

  writeQueue = writeQueue.then(() => writeFile(outreachPath, stringifyCsv(records, outreachHeaders), "utf8"));
  await writeQueue;
  return records;
}

function statusWeight(status) {
  return { needs_approval: 1, draft: 2, approved: 3 }[status] || 9;
}

function nextDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function enrichOutreach(queue, state) {
  return queue.map((outreach) => ({
    ...outreach,
    guardrail: evaluateWhatsAppGuardrail({ outreach, state })
  }));
}

function countSentToday(records) {
  const today = new Date().toISOString().slice(0, 10);
  return records.filter((record) => String(record.sent_at || "").slice(0, 10) === today).length;
}
