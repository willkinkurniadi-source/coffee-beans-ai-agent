import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./lib/env.js";
import { sendJson, readJsonBody, notFound, badRequest } from "./lib/http.js";
import { loadState } from "./services/stateService.js";
import { runDailyWorkflow } from "./services/dailyWorkflow.js";
import { scoreLeads } from "./agents/leadScoringAgent.js";
import { generateOffers } from "./agents/offerAgent.js";
import { generateContentPlan } from "./agents/contentAgent.js";
import { createInvoiceDraft } from "./agents/invoiceAgent.js";
import { createPackingQueue } from "./agents/packingAgent.js";
import { createMarketingPlan } from "./agents/marketingPlannerAgent.js";
import { createPipelinePlan } from "./agents/pipelineAgent.js";
import { createProcurementPlan } from "./agents/procurementAgent.js";
import { generateDailyBrief } from "./agents/dailyBriefAgent.js";
import { getAirtableTableNames, loadAirtableState } from "./services/airtableStateService.js";
import {
  draftOutreach,
  getWhatsAppGuardrailReport,
  listOutreachQueue,
  sendApprovedOutreach,
  updateOutreachStatus
} from "./services/outreachService.js";
import {
  draftDailyContent,
  exportContentToCanva,
  generateContentDesign,
  getContentPublishingStatus,
  listContentQueue,
  publishContentDraft,
  updateContentDraft,
  updateContentStatus
} from "./services/contentService.js";
import { getIntegrationStatus } from "./services/integrationStatusService.js";
import { scrapeLeadsToAirtable } from "./services/leadService.js";
import { readLastWatZapSendStatus, sendWatZapTestMessage } from "./services/whatsappValidationService.js";

loadEnv();

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "..", "public");
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || (process.env.RAILWAY_ENVIRONMENT ? "0.0.0.0" : "127.0.0.1");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const routes = {
  "GET /api/health": async (_req, res) => {
    sendJson(res, { ok: true, service: "coffee-beans-ai-agent" });
  },
  "GET /api/state": async (_req, res) => {
    sendJson(res, await loadState());
  },
  "GET /api/airtable/status": async (_req, res) => {
    const airtable = await loadAirtableState();
    sendJson(res, {
      configured: airtable.configured,
      source: airtable.source,
      tables: airtable.tables || getAirtableTableNames(),
      tableErrors: airtable.tableErrors || {},
      stateHealth: airtable.state?.stateHealth || null
    });
  },
  "GET /api/integrations/status": async (_req, res) => {
    sendJson(res, await getIntegrationStatus());
  },
  "GET /api/integrations": async (_req, res) => {
    sendJson(res, await getIntegrationStatus());
  },
  "POST /api/run/daily": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, await runDailyWorkflow(input));
  },
  "POST /api/daily-brief/generate": async (req, res) => {
    const input = await readJsonBody(req);
    const state = input.state || (await loadState());
    sendJson(res, { dailyBrief: generateDailyBrief(state, input) });
  },
  "GET /api/outreach/queue": async (_req, res) => {
    sendJson(res, { outreachQueue: await listOutreachQueue() });
  },
  "GET /api/whatsapp/guardrails": async (_req, res) => {
    sendJson(res, { guardrails: await getWhatsAppGuardrailReport() });
  },
  "GET /api/whatsapp/test-send/status": async (_req, res) => {
    sendJson(res, { status: await readLastWatZapSendStatus() });
  },
  "POST /api/whatsapp/test-send": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, await sendWatZapTestMessage(input));
  },
  "POST /api/outreach/draft": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { drafts: await draftOutreach(input), outreachQueue: await listOutreachQueue() });
  },
  "POST /api/outreach/approve": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { outreach: await updateOutreachStatus({ ...input, status: "approved" }) });
  },
  "POST /api/outreach/reject": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { outreach: await updateOutreachStatus({ ...input, status: "stopped" }) });
  },
  "POST /api/outreach/send": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, await sendApprovedOutreach(input));
  },
  "POST /api/leads/score": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { leads: scoreLeads(input.leads || [], input.stock || []) });
  },
  "POST /api/leads/scrape": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, await scrapeLeadsToAirtable(input));
  },
  "POST /api/offers/generate": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { offers: generateOffers(input.stock || [], input.leads || []) });
  },
  "POST /api/content/generate": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { content: generateContentPlan(input.products || [], input.brandVoice || "roaster partner") });
  },
  "GET /api/content/queue": async (_req, res) => {
    sendJson(res, { contentQueue: await listContentQueue() });
  },
  "GET /api/content/publishing/status": async (_req, res) => {
    sendJson(res, getContentPublishingStatus());
  },
  "POST /api/content/draft": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { drafts: await draftDailyContent(input), contentQueue: await listContentQueue() });
  },
  "POST /api/content/update": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { content: await updateContentDraft(input), contentQueue: await listContentQueue() });
  },
  "POST /api/content/approve": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { content: await updateContentStatus({ ...input, status: "approved" }) });
  },
  "POST /api/content/schedule": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { content: await updateContentStatus({ ...input, status: "scheduled" }) });
  },
  "POST /api/content/publish": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, await publishContentDraft(input));
  },
  "POST /api/content/canva": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { content: await exportContentToCanva(input), contentQueue: await listContentQueue() });
  },
  "POST /api/content/design": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, await generateContentDesign(input));
  },
  "POST /api/content/reject": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { content: await updateContentStatus({ ...input, status: "draft" }) });
  },
  "POST /api/marketing/plan": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { marketingPlan: createMarketingPlan(input) });
  },
  "POST /api/pipeline/plan": async (req, res) => {
    const input = await readJsonBody(req);
    const leads = scoreLeads(input.leads || [], input.stock || []);
    const offers = generateOffers(input.stock || [], leads);
    sendJson(res, { pipeline: createPipelinePlan(leads, offers) });
  },
  "POST /api/procurement/plan": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { procurement: createProcurementPlan(input) });
  },
  "POST /api/invoices/draft": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { invoice: createInvoiceDraft(input.order, input.customer) });
  },
  "POST /api/packing/create": async (req, res) => {
    const input = await readJsonBody(req);
    sendJson(res, { packing: createPackingQueue(input.orders || []) });
  }
};

async function serveStatic(req, res) {
  const safePath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const filePath = join(publicDir, safePath);
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    notFound(res);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const key = `${req.method} ${req.url.split("?")[0]}`;
    if (routes[key]) {
      await routes[key](req, res);
      return;
    }
    if (req.method === "GET") {
      await serveStatic(req, res);
      return;
    }
    notFound(res);
  } catch (error) {
    if (error.name === "SyntaxError") {
      badRequest(res, "Invalid JSON body");
      return;
    }
    console.error(error);
    sendJson(res, { error: "Internal server error", detail: error.message }, 500);
  }
});

server.listen(port, host, () => {
  console.log(`Coffee Beans AI Agent running at http://${host}:${port}`);
});
