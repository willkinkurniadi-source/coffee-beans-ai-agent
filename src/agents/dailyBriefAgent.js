import { toNumber } from "../lib/csv.js";
import { scoreLeads } from "./leadScoringAgent.js";
import { generateOffers } from "./offerAgent.js";
import { createProcurementPlan } from "./procurementAgent.js";

export function generateDailyBrief(state, options = {}) {
  const date = options.date || new Date().toISOString().slice(0, 10);
  const stock = state.stock || [];
  const leads = scoreLeads(state.leads || [], stock);
  const offers = generateOffers(stock, leads);
  const orders = state.orders || [];
  const outreachLog = state.outreachLog || [];
  const contentCalendar = state.contentCalendar || [];
  const procurement = createProcurementPlan({
    stock,
    packaging: state.packaging || [],
    orders
  });

  const priorityProduct = choosePriorityProduct(stock, orders);
  const topLeads = leads.slice(0, 10);
  const dueOutreach = findDueOutreach(outreachLog, date);
  const pendingOutreach = findPendingOutreach(outreachLog);
  const pendingContent = findPendingContent(contentCalendar, date);
  const revenueToday = revenueForDate(orders, date);
  const blockers = findBlockers({ procurement, topLeads, pendingContent });

  return {
    date,
    owner_summary: buildOwnerSummary({ priorityProduct, topLeads, procurement, revenueToday, blockers }),
    priority_product: priorityProduct?.nama_produk || "Classic Blend",
    revenue_today: revenueToday,
    top_leads: topLeads.map((lead) => ({
      lead_id: lead.lead_id,
      cafe_name: lead.nama_cafe,
      city: lead.kota,
      score: lead.lead_score,
      next_action: lead.next_action,
      followup_due: lead.next_followup_date
    })),
    content_tasks: buildContentTasks(pendingContent, priorityProduct),
    outreach_tasks: buildOutreachTasks({ dueOutreach, pendingOutreach, offers }),
    stock_alerts: buildStockAlerts(procurement),
    procurement_summary: procurement.owner_summary,
    blockers,
    tomorrow_focus: buildTomorrowFocus({ topLeads, priorityProduct, procurement }),
    metrics: {
      leads_total: leads.length,
      hot_leads: leads.filter((lead) => lead.lead_score >= 80).length,
      outreach_due: dueOutreach.length,
      outreach_pending: pendingOutreach.length,
      content_pending: pendingContent.length,
      orders_total: orders.length,
      packaging_alerts: procurement.packaging_alerts.filter((item) => item.priority === "high").length
    }
  };
}

function choosePriorityProduct(stock, orders) {
  const soldBySku = orders.reduce((map, order) => {
    map[order.sku] = (map[order.sku] || 0) + toNumber(order.quantity_kg || order.qty);
    return map;
  }, {});

  return [...stock]
    .filter((item) => toNumber(item.quantity_kg) > 0 && isCoffeeBeanProduct(item))
    .sort((a, b) => productWeight(b, soldBySku) - productWeight(a, soldBySku))[0];
}

function productWeight(item, soldBySku) {
  let score = toNumber(item.quantity_kg);
  if (item.priority_to_sell === "high") score += 100;
  if (/classic blend/i.test(item.nama_produk || "")) score += 30;
  if (/house robusta/i.test(item.nama_produk || "")) score += 20;
  score += toNumber(soldBySku[item.sku]) * 5;
  return score;
}

function isCoffeeBeanProduct(item) {
  const text = `${item.nama_produk || ""} ${item.product_name || ""} ${item.jenis || ""} ${item.category || ""}`;
  return /coffee|kopi|beans|bean|robusta|arabica|blend|espresso|gayo|kintamani|preanger/i.test(text) && !/packaging|pouch|bag|sticker|label/i.test(text);
}

function findDueOutreach(outreachLog, date) {
  return outreachLog.filter((item) => {
    if (["sent", "stopped"].includes(item.status)) return false;
    if (!item.next_followup_date) return ["draft", "needs_approval", "approved"].includes(item.status);
    return item.next_followup_date <= date;
  });
}

function findPendingOutreach(outreachLog) {
  return outreachLog.filter((item) => ["draft", "needs_approval", "approved"].includes(item.status));
}

function findPendingContent(contentCalendar, date) {
  return contentCalendar.filter((item) => {
    if (["published", "measured"].includes(item.status)) return false;
    return !item.date || item.date <= date;
  });
}

function revenueForDate(orders, date) {
  return orders
    .filter((order) => !order.order_date || order.order_date <= date)
    .reduce((sum, order) => sum + toNumber(order.total || order.total_price), 0);
}

function buildContentTasks(pendingContent, priorityProduct) {
  const defaults = [
    `Generate IG edukasi untuk ${priorityProduct?.nama_produk || "Classic Blend"}`,
    "Generate TikTok founder script 30-60 detik",
    "Generate WhatsApp broadcast sample 300g"
  ];

  if (pendingContent.length === 0) return defaults;

  return pendingContent.slice(0, 5).map((item) => {
    const product = item.product_focus || priorityProduct?.nama_produk || "Classic Blend";
    return `${item.platform || item.channel}: ${item.content_type} untuk ${product} (${item.status})`;
  });
}

function buildOutreachTasks({ dueOutreach, pendingOutreach, offers }) {
  const tasks = [];
  if (pendingOutreach.length) {
    tasks.push(`${pendingOutreach.length} outreach ada di queue untuk review/approval/send.`);
  }
  if (dueOutreach.length) {
    tasks.push(`Review ${dueOutreach.length} outreach draft/follow-up yang due hari ini.`);
  }
  if (offers.length) {
    tasks.push(`Generate/approve ${Math.min(offers.length, 20)} offer message untuk qualified cafe leads.`);
  }
  if (tasks.length === 0) {
    tasks.push("Tidak ada outreach due; scrape/import leads baru sebelum jam 10.00.");
  }
  return tasks;
}

function buildStockAlerts(procurement) {
  const packagingAlerts = procurement.packaging_alerts
    .filter((item) => item.priority === "high")
    .map((item) => `${item.item_name}: stock ${item.stock_qty}, reorder point ${item.reorder_point}`);
  const roastAlerts = procurement.roast_plan
    .filter((item) => item.priority === "high")
    .map((item) => `${item.product_name}: ${item.action}`);
  return [...roastAlerts, ...packagingAlerts];
}

function findBlockers({ procurement, topLeads, pendingContent }) {
  const blockers = [];
  const packagingAlerts = procurement.packaging_alerts.filter((item) => item.priority === "high");
  if (packagingAlerts.length) blockers.push(`${packagingAlerts.length} item packaging perlu reorder sebelum scale sample.`);
  if (!topLeads.length) blockers.push("Belum ada hot leads; perlu scrape/import lead cafe.");
  if (!pendingContent.length) blockers.push("Content calendar kosong; perlu generate konten harian.");
  return blockers;
}

function buildOwnerSummary({ priorityProduct, topLeads, procurement, revenueToday, blockers }) {
  const product = priorityProduct?.nama_produk || "Classic Blend";
  return [
    `Fokus hari ini: ${product}.`,
    `${topLeads.length} lead prioritas siap dikejar.`,
    `Revenue tercatat: Rp${revenueToday.toLocaleString("id-ID")}.`,
    procurement.owner_summary,
    blockers.length ? `Blocker: ${blockers[0]}` : "Tidak ada blocker utama."
  ].join(" ");
}

function buildTomorrowFocus({ topLeads, priorityProduct, procurement }) {
  if (procurement.packaging_alerts.some((item) => item.priority === "high")) {
    return "Selesaikan reorder packaging agar sample/outreach tidak tersendat.";
  }
  if (topLeads.length < 10) {
    return "Tambah lead cafe baru dan tingkatkan kualitas enrichment.";
  }
  return `Scale outreach untuk ${priorityProduct?.nama_produk || "Classic Blend"} dan follow-up sample request.`;
}
