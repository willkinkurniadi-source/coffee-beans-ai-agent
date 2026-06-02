import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv } from "../lib/csv.js";
import { normalizeState, summarizeStateHealth } from "../schemas/state.js";
import { loadAirtableState } from "./airtableStateService.js";

const dataDir = join(process.cwd(), "data");
const sourceMode = process.env.DATA_SOURCE || "auto";

async function readCsv(name) {
  try {
    const text = await readFile(join(dataDir, name), "utf8");
    return parseCsv(text);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function loadCsvState() {
  const [products, stock, leads, outreachLog, orders, packaging, contentCalendar, dailyBriefs] = await Promise.all([
    readCsv("products.csv"),
    readCsv("stock.csv"),
    readCsv("leads.csv"),
    readCsv("outreach_log.csv"),
    readCsv("orders.csv"),
    readCsv("packaging.csv"),
    readCsv("content_calendar.csv"),
    readCsv("daily_briefs.csv")
  ]);

  const state = normalizeState({ products, stock, leads, outreachLog, orders, packaging, contentCalendar, dailyBriefs });
  return {
    ...state,
    stateHealth: {
      ...summarizeStateHealth(state),
      source: "csv"
    }
  };
}

export async function loadState() {
  if (sourceMode === "csv") return loadCsvState();

  if (sourceMode === "airtable" || sourceMode === "auto") {
    try {
      const airtable = await loadAirtableState();
      if (airtable.configured && airtable.state?.stateHealth?.ready) return airtable.state;
      if (sourceMode === "airtable") {
        return {
          ...(airtable.state || normalizeState({})),
          stateHealth: {
            ...(airtable.state?.stateHealth || summarizeStateHealth(normalizeState({}))),
            source: airtable.source,
            ready: false
          }
        };
      }
    } catch (error) {
      if (sourceMode === "airtable") throw error;
      console.warn(`Airtable unavailable, falling back to CSV: ${error.message}`);
    }
  }

  return loadCsvState();
}
