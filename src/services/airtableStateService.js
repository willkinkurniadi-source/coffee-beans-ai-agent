import { fetchAirtableTable, isAirtableConfigured } from "../connectors/airtableClient.js";
import { normalizeState, summarizeStateHealth } from "../schemas/state.js";

const tableEnvMap = {
  products: "AIRTABLE_TABLE_PRODUCTS",
  stock: "AIRTABLE_TABLE_STOCK",
  leads: "AIRTABLE_TABLE_LEADS",
  outreachLog: "AIRTABLE_TABLE_OUTREACH_LOG",
  orders: "AIRTABLE_TABLE_ORDERS",
  packaging: "AIRTABLE_TABLE_PACKAGING",
  contentCalendar: "AIRTABLE_TABLE_CONTENT_CALENDAR",
  dailyBriefs: "AIRTABLE_TABLE_DAILY_BRIEFS"
};

const defaultTableNames = {
  products: "Products",
  stock: "Stock",
  leads: "Leads",
  outreachLog: "Outreach Log",
  orders: "Orders",
  packaging: "Packaging",
  contentCalendar: "Content Calendar",
  dailyBriefs: "Daily Brief"
};

export function getAirtableTableNames() {
  return Object.fromEntries(
    Object.entries(defaultTableNames).map(([key, defaultName]) => [key, process.env[tableEnvMap[key]] || defaultName])
  );
}

export async function loadAirtableState() {
  if (!isAirtableConfigured()) {
    return {
      configured: false,
      state: null,
      source: "airtable_not_configured"
    };
  }

  const tables = getAirtableTableNames();
  const tableResults = await Promise.all(
    Object.entries(tables).map(async ([key, tableName]) => {
      try {
      const result = await fetchAirtableTable(tableName);
        return { key, records: result.records || [] };
      } catch (error) {
        return {
          key,
          records: [],
          error: {
            tableName,
            message: error.message
          }
        };
      }
    })
  );

  const entries = tableResults.map(({ key, records }) => [key, records]);
  const tableErrors = Object.fromEntries(
    tableResults.filter(({ error }) => error).map(({ key, error }) => [key, error])
  );
  const state = normalizeState(Object.fromEntries(entries));
  return {
    configured: true,
    source: "airtable",
    tables,
    tableErrors,
    state: {
      ...state,
      stateHealth: {
        ...summarizeStateHealth(state),
        source: "airtable",
        airtableTableErrors: Object.keys(tableErrors).length
      }
    }
  };
}
