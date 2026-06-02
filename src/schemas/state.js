import {
  normalizeContent,
  normalizeDailyBrief,
  normalizeLead,
  normalizeOrder,
  normalizeOutreach,
  normalizePackaging,
  normalizeProduct,
  normalizeStockItem
} from "./records.js";

export function normalizeState(raw = {}) {
  return {
    products: (raw.products || []).map(normalizeProduct),
    stock: (raw.stock || []).map(normalizeStockItem),
    leads: (raw.leads || []).map(normalizeLead),
    outreachLog: (raw.outreachLog || []).map(normalizeOutreach),
    orders: (raw.orders || []).map(normalizeOrder),
    packaging: (raw.packaging || []).map(normalizePackaging),
    contentCalendar: (raw.contentCalendar || []).map(normalizeContent),
    dailyBriefs: (raw.dailyBriefs || []).map(normalizeDailyBrief)
  };
}

export function summarizeStateHealth(state) {
  return {
    products: state.products.length,
    stock: state.stock.length,
    leads: state.leads.length,
    outreachLog: state.outreachLog.length,
    orders: state.orders.length,
    packaging: state.packaging.length,
    contentCalendar: state.contentCalendar.length,
    dailyBriefs: state.dailyBriefs.length,
    ready: state.products.length > 0 && state.stock.length > 0
  };
}

