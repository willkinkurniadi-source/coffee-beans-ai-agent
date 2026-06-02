import { loadState } from "./stateService.js";
import { scoreLeads } from "../agents/leadScoringAgent.js";
import { generateOffers } from "../agents/offerAgent.js";
import { generateContentPlan } from "../agents/contentAgent.js";
import { createPackingQueue } from "../agents/packingAgent.js";
import { createMarketingPlan } from "../agents/marketingPlannerAgent.js";
import { createPipelinePlan } from "../agents/pipelineAgent.js";
import { createProcurementPlan } from "../agents/procurementAgent.js";
import { createContractRecommendations } from "../agents/contractAgent.js";
import { generateDailyBrief } from "../agents/dailyBriefAgent.js";
import { listOutreachQueue } from "./outreachService.js";
import { listContentQueue } from "./contentService.js";

export async function runDailyWorkflow(input = {}) {
  const log = [];
  const t0 = Date.now();

  function step(agent, fn) {
    const start = Date.now();
    try {
      const result = fn();
      const ms = Date.now() - start;
      log.push({ agent, status: "ok", ms, detail: summarize(agent, result) });
      return result;
    } catch (err) {
      const ms = Date.now() - start;
      log.push({ agent, status: "error", ms, detail: err.message });
      throw err;
    }
  }

  async function stepAsync(agent, fn) {
    const start = Date.now();
    try {
      const result = await fn();
      const ms = Date.now() - start;
      log.push({ agent, status: "ok", ms, detail: summarize(agent, result) });
      return result;
    } catch (err) {
      const ms = Date.now() - start;
      log.push({ agent, status: "error", ms, detail: err.message });
      throw err;
    }
  }

  const state = await stepAsync("State Loader", () =>
    input.stock && input.leads ? Promise.resolve(input) : loadState()
  );

  const stock = state.stock || [];
  const leads = step("Lead Scoring Agent", () => scoreLeads(state.leads || [], stock));
  const offers = step("Offer Agent", () => generateOffers(stock, leads));
  const content = step("Content Agent", () =>
    generateContentPlan(stock, input.brandVoice || "supplier kopi cafe yang reliable dan specialty-aware")
  );
  const packing = step("Packing Agent", () => createPackingQueue(state.orders || []));
  const marketingPlan = step("Marketing Planner Agent", () =>
    createMarketingPlan({ stock, leads, orders: state.orders || [], contentCalendar: state.contentCalendar || [] })
  );
  const pipeline = step("Pipeline Agent", () => createPipelinePlan(leads, offers));
  const procurement = step("Procurement Agent", () =>
    createProcurementPlan({ stock, packaging: state.packaging || [], orders: state.orders || [] })
  );
  const contracts = step("Contract Agent", () => createContractRecommendations(pipeline));
  const dailyBrief = step("Daily Brief Agent", () => generateDailyBrief(state, input));
  const outreachQueue = await stepAsync("Outreach Queue", () => listOutreachQueue());
  const contentQueue = await stepAsync("Content Queue", () => listContentQueue());

  const totalMs = Date.now() - t0;

  return {
    date: new Date().toISOString().slice(0, 10),
    agentLog: {
      ran_at: new Date().toISOString(),
      total_ms: totalMs,
      steps: log
    },
    dailyBrief,
    priorityProducts: stock
      .filter((item) => (item.priority_to_sell === "high" || Number(item.quantity_kg) > 0) && isCoffeeBeanProduct(item))
      .slice(0, 5),
    dailyPlan: createDailyPlan({ marketingPlan, procurement, offers, pipeline }),
    marketingPlan,
    topLeads: leads.slice(0, 20),
    offers: offers.slice(0, 20),
    pipeline,
    outreachQueue,
    contentQueue,
    content,
    packing,
    procurement,
    contracts,
    stateHealth: state.stateHealth,
    kpi: {
      leadsLoaded: leads.length,
      hotLeads: leads.filter((lead) => lead.lead_score >= 80).length,
      offersGenerated: offers.length,
      outreachQueue: outreachQueue.length,
      contentQueue: contentQueue.length,
      packingQueue: packing.length,
      procurementAlerts: procurement.packaging_alerts.filter((item) => item.priority === "high").length
    }
  };
}

function summarize(agent, result) {
  if (!result) return "ran";
  if (Array.isArray(result)) return `${result.length} items`;
  if (typeof result === "object") {
    if (agent === "Lead Scoring Agent") return `${result.length ?? "?"} leads scored`;
    if (agent === "Offer Agent") return `${result.length ?? "?"} offers generated`;
    if (agent === "State Loader") return `source: ${result.stateHealth?.source || "loaded"}`;
    if (agent === "Marketing Planner Agent") return `focus: ${result.focus_product || "?"}`;
    if (agent === "Pipeline Agent") return `${result.length ?? "?"} pipeline items`;
    if (agent === "Procurement Agent") return `${result.packaging_alerts?.length ?? 0} alerts`;
    if (agent === "Contract Agent") return `${result.length ?? "?"} contracts`;
    if (agent === "Daily Brief Agent") return result.priority_product ? `priority: ${result.priority_product}` : "brief generated";
    if (agent === "Outreach Queue") return `${result.length ?? "?"} in queue`;
    if (agent === "Content Queue") return `${result.length ?? "?"} in queue`;
    if (agent === "Content Agent") return `${result.content?.length ?? "?"} drafts`;
    if (agent === "Packing Agent") return `${result.length ?? "?"} packing items`;
    return "done";
  }
  return String(result).slice(0, 60);
}

function isCoffeeBeanProduct(item) {
  const text = `${item.nama_produk || ""} ${item.product_name || ""} ${item.jenis || ""} ${item.category || ""}`;
  return /coffee|kopi|beans|bean|robusta|arabica|blend|espresso|gayo|kintamani|preanger/i.test(text) && !/packaging|pouch|bag|sticker|label/i.test(text);
}

function createDailyPlan({ marketingPlan, procurement, offers, pipeline }) {
  const hotPipeline = pipeline.filter((item) => item.priority === "P1");
  return [
    { time: "07.00", owner: "Operations", task: procurement.owner_summary, status: "todo" },
    { time: "08.00", owner: "Marketing", task: `Publish plan untuk ${marketingPlan.focus_product}: IG edukasi, TikTok short, WA broadcast.`, status: "todo" },
    { time: "09.00", owner: "Sales", task: `Prioritaskan ${hotPipeline.length} hot cafe leads dan ${offers.length} offer ready stock/sample.`, status: "todo" },
    { time: "13.00", owner: "Marketing", task: "Upload konten dan catat URL post untuk tracking.", status: "todo" },
    { time: "15.00", owner: "Sales Admin", task: "Buat invoice untuk order approved dan follow-up payment.", status: "todo" },
    { time: "17.00", owner: "Production", task: "Packing order paid/approved dan update status fulfillment.", status: "todo" }
  ];
}
