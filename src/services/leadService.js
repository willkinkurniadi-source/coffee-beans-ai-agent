import { scrapeCafeLeads } from "../connectors/scraperClient.js";
import { normalizeLead } from "../schemas/records.js";
import {
  createAirtableDataRecord,
  readAirtableRecords,
  shouldUseAirtableWrites,
  updateAirtableDataRecord
} from "./airtableRecordService.js";

export async function scrapeLeadsToAirtable({ city = "Jakarta Selatan", keyword = "cafe coffee shop", limit = 10 } = {}) {
  const scrapeResult = await scrapeCafeLeads({ city, keyword, limit });
  const scrapedLeads = (scrapeResult.leads || []).slice(0, limit).map((lead) => ({
    ...normalizeLead({
      ...lead,
      status: "new",
      scraping_status: scrapeResult.mocked ? "Mocked" : "Completed"
    }),
    scraping_status: scrapeResult.mocked ? "Mocked" : "Completed"
  }));

  if (!shouldUseAirtableWrites()) {
    return {
      mocked: scrapeResult.mocked,
      source: "local_only",
      created: [],
      updated: [],
      skipped: scrapedLeads,
      message: "Airtable belum aktif untuk write; hasil scrape tidak disimpan."
    };
  }

  const existing = (await readAirtableRecords("leads")).map(normalizeLead);
  const created = [];
  const updated = [];

  for (const lead of scrapedLeads) {
    const match = findExistingLead(existing, lead);
    if (match?.lead_id?.startsWith("rec")) {
      const record = await updateAirtableDataRecord("leads", { ...match, airtable_record_id: match.lead_id }, lead);
      updated.push(normalizeLead(record));
    } else {
      const record = await createAirtableDataRecord("leads", lead);
      created.push(normalizeLead(record));
    }
  }

  return {
    mocked: scrapeResult.mocked,
    source: "airtable",
    created,
    updated,
    skipped: [],
    total_scraped: scrapedLeads.length
  };
}

function findExistingLead(existing, lead) {
  const targetName = normalizeKey(lead.cafe_name || lead.nama_cafe);
  const targetCity = normalizeKey(lead.city || lead.kota);
  const targetPhone = normalizePhone(lead.phone || lead.wa_number);

  return existing.find((item) => {
    const phoneMatch = targetPhone && normalizePhone(item.phone || item.wa_number) === targetPhone;
    const nameCityMatch =
      targetName &&
      normalizeKey(item.cafe_name || item.nama_cafe) === targetName &&
      normalizeKey(item.city || item.kota) === targetCity;
    return phoneMatch || nameCityMatch;
  });
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}
