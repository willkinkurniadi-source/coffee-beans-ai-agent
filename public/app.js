const button = document.querySelector("#runDaily");
const runDailyLabel = document.querySelector("#runDailyLabel");
const kpi = document.querySelector("#kpi");
const automationStatus = document.querySelector("#automationStatus");
const apiConnections = document.querySelector("#apiConnections");
const apiProgress = document.querySelector("#apiProgress");
const roadmap = document.querySelector("#roadmap");
const roadmapProgress = document.querySelector("#roadmapProgress");
const monitoringChecklist = document.querySelector("#monitoringChecklist");
const ownerBrief = document.querySelector("#ownerBrief");
const dailyPlan = document.querySelector("#dailyPlan");
const marketingPlan = document.querySelector("#marketingPlan");
const leads = document.querySelector("#leads");
const scrapeCafeToday = document.querySelector("#scrapeCafeToday");
const scrapeStatus = document.querySelector("#scrapeStatus");
const offers = document.querySelector("#offers");
const pipeline = document.querySelector("#pipeline");
const outreachQueue = document.querySelector("#outreachQueue");
const generateOutreach = document.querySelector("#generateOutreach");
const content = document.querySelector("#content");
const generateContent = document.querySelector("#generateContent");
const procurement = document.querySelector("#procurement");
const packing = document.querySelector("#packing");
const contracts = document.querySelector("#contracts");
const aiActivityLog = document.querySelector("#aiActivityLog");
const ailogMeta = document.querySelector("#ailogMeta");

button.addEventListener("click", runDaily);
scrapeCafeToday.addEventListener("click", scrapeCafesToday);
generateOutreach.addEventListener("click", generateOutreachDrafts);
generateContent.addEventListener("click", generateContentDrafts);
runDaily();

async function runDaily() {
  button.disabled = true;
  if (runDailyLabel) runDailyLabel.textContent = "Running...";
  try {
    renderLoadingState();
    const response = await fetchWithTimeout("/api/run/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    }, 90000);
    if (!response.ok) throw new Error(`Daily workflow gagal: HTTP ${response.status}`);
    const data = await response.json();
    const integrations = await fetchJson("/api/integrations/status");
    data.integrations = integrations;
    render(data);
  } catch (error) {
    renderErrorState(error);
  } finally {
    button.disabled = false;
    if (runDailyLabel) runDailyLabel.textContent = "Run Daily";
  }
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;
  return response.json();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function generateOutreachDrafts() {
  generateOutreach.disabled = true;
  generateOutreach.textContent = "Generating...";
  try {
    await fetch("/api/outreach/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 20 })
    });
    await runDaily();
  } finally {
    generateOutreach.disabled = false;
    generateOutreach.textContent = "Generate Drafts";
  }
}

async function scrapeCafesToday() {
  scrapeCafeToday.disabled = true;
  scrapeCafeToday.textContent = "Scraping...";
  scrapeStatus.innerHTML = `
    <article class="inline-status-card warn">
      <strong>Scraper berjalan</strong>
      <p>Mencari cafe hari ini dan menyimpan hasilnya ke Airtable.</p>
    </article>
  `;

  try {
    const response = await fetchWithTimeout("/api/leads/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: "Jakarta Selatan",
        keyword: "coffee shop cafe",
        limit: 10
      })
    }, 90000);
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || result.error || `HTTP ${response.status}`);

    scrapeStatus.innerHTML = `
      <article class="inline-status-card ok">
        <strong>${result.created?.length || 0} baru · ${result.updated?.length || 0} update</strong>
        <p>${escapeHtml(`Sumber: ${result.source}. Total scrape: ${result.total_scraped || 0}. Data sudah masuk Airtable.`)}</p>
      </article>
    `;
    await runDaily();
  } catch (error) {
    scrapeStatus.innerHTML = `
      <article class="inline-status-card failed">
        <strong>Scrape gagal</strong>
        <p>${escapeHtml(error?.message || "Tidak bisa scrape cafe hari ini.")}</p>
      </article>
    `;
  } finally {
    scrapeCafeToday.disabled = false;
    scrapeCafeToday.textContent = "Scrape Cafe Hari Ini";
  }
}

async function updateOutreach(outreachId, action) {
  await fetch(`/api/outreach/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outreach_id: outreachId, approved_by: "owner" })
  });
  await runDaily();
}

async function sendOutreach(outreachId) {
  const response = await fetch("/api/outreach/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outreach_id: outreachId })
  });
  const result = await response.json();
  if (!result.sent) {
    window.alert(`Belum bisa send: ${(result.guardrail?.reasons || []).join(" | ") || "Guardrail blocked"}`);
  }
  await runDaily();
}

async function generateContentDrafts() {
  generateContent.disabled = true;
  generateContent.textContent = "Generating...";
  try {
    await fetch("/api/content/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 4 })
    });
    await runDaily();
  } finally {
    generateContent.disabled = false;
    generateContent.textContent = "Generate Content";
  }
}

async function updateContent(contentId, action) {
  const payload = { content_id: contentId };
  if (action === "canva") {
    const canvaUrl = window.prompt("Masukkan link folder/queue Canva untuk konten ini. Kosongkan kalau belum ada.");
    if (canvaUrl) payload.canva_url = canvaUrl.trim();
  }
  const response = await fetchWithTimeout(`/api/content/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }, action === "design" ? 90000 : 15000);
  const result = await response.json();
  if (action === "publish" && result.result && !result.result.published) {
    window.alert(`Publish belum jalan: ${result.result.message}`);
  }
  if (action === "design" && result.result && !result.result.generated) {
    window.alert(`Design belum jadi image: ${result.result.message}`);
  }
  if (action === "canva") {
    window.alert("Konten ditandai masuk Canva workflow. Status dan link queue/folder akan tetap tampil di dashboard.");
  }
  await runDaily();
}

async function saveContentDraft(form) {
  const fields = new FormData(form);
  const response = await fetch("/api/content/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(fields.entries()))
  });
  if (!response.ok) {
    window.alert("Content belum berhasil disimpan.");
    return;
  }
  await runDaily();
}

function render(data) {
  kpi.innerHTML = Object.entries(data.kpi || {})
    .map(([label, value]) => `<div class="kpi-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`)
    .join("");
  renderAgentLog(data.agentLog);

  automationStatus.innerHTML = renderAutomationStatus(data);
  renderApiConnections(data.integrations);
  renderRoadmapAndChecklist(data);
  ownerBrief.innerHTML = renderOwnerBrief(data.dailyBrief || {});

  dailyPlan.innerHTML = (data.dailyPlan || [])
    .map((item) => `
      <article class="timeline-item">
        <strong>${escapeHtml(item.time)} · ${escapeHtml(item.owner)}</strong>
        <p>${escapeHtml(item.task)}</p>
      </article>
    `)
    .join("");

  marketingPlan.innerHTML = `
    <article class="item accent">
      <strong>${escapeHtml(data.marketingPlan?.focus_product || "Produk belum dipilih")}</strong>
      <small>${escapeHtml(data.marketingPlan?.stock_logic || "")}</small>
      <p>${escapeHtml(data.marketingPlan?.objective || "")}</p>
    </article>
    ${(data.marketingPlan?.channel_plan || [])
      .map((item) => `
        <article class="item">
          <strong>${escapeHtml(item.channel)}</strong>
          <small>${escapeHtml(item.cta)}</small>
          <p>${escapeHtml(item.action)}</p>
        </article>
      `)
      .join("")}
  `;

  leads.innerHTML = (data.topLeads || [])
    .slice(0, 8)
    .map((lead) => `
      <article class="item">
        <strong>${escapeHtml(lead.nama_cafe || "Unknown cafe")} <span class="score">${lead.lead_score}</span></strong>
        <small>${escapeHtml([lead.kota, lead.area, lead.segment].filter(Boolean).join(" · "))}</small>
        <p>${escapeHtml(lead.next_action || "")}</p>
        <small>${escapeHtml((lead.score_reasons || []).slice(0, 2).join(" · "))}</small>
      </article>
    `)
    .join("");

  offers.innerHTML = (data.offers || [])
    .slice(0, 8)
    .map((offer) => `
      <article class="item">
        <strong>${escapeHtml(offer.nama_cafe)} → ${escapeHtml(offer.product_name)}</strong>
        <small>${escapeHtml([offer.offer_type, offer.availability?.note, offer.match_reason].filter(Boolean).join(" · "))}</small>
        <p>${escapeHtml(offer.message)}</p>
      </article>
    `)
    .join("");

  pipeline.innerHTML = (data.pipeline || [])
    .slice(0, 12)
    .map((item) => `
      <article class="item">
        <strong>${escapeHtml(item.priority)} · ${escapeHtml(item.nama_cafe)}</strong>
        <small>${escapeHtml(item.stage)} · ${escapeHtml(item.offer_type)}</small>
        <p>${escapeHtml(item.next_action)}</p>
        <small>${escapeHtml(item.match_reason || "")}</small>
      </article>
    `)
    .join("");

  outreachQueue.innerHTML = (data.outreachQueue || [])
    .map((item) => `
      <article class="item">
        <strong>${escapeHtml(item.status)} · ${escapeHtml(item.lead_id)} · ${escapeHtml(item.channel)}</strong>
        <small>${escapeHtml([item.message_type, item.next_followup_date].filter(Boolean).join(" · "))}</small>
        <p>${escapeHtml(item.message_draft)}</p>
        ${renderGuardrail(item.guardrail)}
        <div class="actions">
          <button type="button" data-outreach-action="approve" data-outreach-id="${escapeHtml(item.outreach_id)}">Approve</button>
          <button type="button" data-outreach-action="send" data-outreach-id="${escapeHtml(item.outreach_id)}">Send</button>
          <button type="button" data-outreach-action="reject" data-outreach-id="${escapeHtml(item.outreach_id)}" class="secondary">Reject</button>
        </div>
      </article>
    `)
    .join("") || `<article class="item"><p>Belum ada outreach draft. Klik Generate Drafts.</p></article>`;

  outreachQueue.querySelectorAll("[data-outreach-action]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.outreachAction === "send") {
        sendOutreach(button.dataset.outreachId);
        return;
      }
      updateOutreach(button.dataset.outreachId, button.dataset.outreachAction);
    });
  });

  content.innerHTML = renderContentFactory(data);
  content.querySelectorAll("[data-content-action]").forEach((button) => {
    button.addEventListener("click", () => updateContent(button.dataset.contentId, button.dataset.contentAction));
  });
  content.querySelectorAll("[data-content-edit]").forEach((button) => {
    button.addEventListener("click", () => toggleContentEditor(button.dataset.contentEdit));
  });
  content.querySelectorAll("[data-content-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveContentDraft(form);
    });
  });

  procurement.innerHTML = `
    <article class="item accent">
      <strong>Owner Summary</strong>
      <p>${escapeHtml(data.procurement?.owner_summary || "")}</p>
    </article>
    ${(data.procurement?.roast_plan || [])
      .map((item) => `
        <article class="item">
          <strong>${escapeHtml(item.product_name)} · ${item.stock_kg}kg</strong>
          <small>${escapeHtml(`Velocity ${item.estimated_weekly_velocity_kg}kg/minggu · cover ${item.days_cover} hari`)}</small>
          <p>${escapeHtml(item.action)}</p>
        </article>
      `)
      .join("")}
    ${(data.procurement?.packaging_alerts || [])
      .map((item) => `
        <article class="item">
          <strong>${escapeHtml(item.priority.toUpperCase())} · ${escapeHtml(item.item_name)}</strong>
          <small>${escapeHtml(`Stock ${item.stock_qty}, reorder point ${item.reorder_point}`)}</small>
          <p>${escapeHtml(item.action)}</p>
        </article>
      `)
      .join("")}
  `;

  packing.innerHTML = (data.packing || [])
    .map((item) => `
      <article class="item">
        <strong>${escapeHtml(item.order_id)} · ${escapeHtml(item.customer_name)}</strong>
        <small>${escapeHtml(item.product_name)} · ${item.quantity_kg} kg · ${escapeHtml(item.expedition)}</small>
        <p>${item.blocked ? "Blocked: alamat belum lengkap" : "Ready for production/packing"}</p>
      </article>
    `)
    .join("");

  contracts.innerHTML = (data.contracts || [])
    .map((item) => `
      <article class="item">
        <strong>${escapeHtml(item.nama_cafe)} · ${escapeHtml(item.contract_type)}</strong>
        <small>${escapeHtml(item.recommended_terms.join(" | "))}</small>
        <p>${escapeHtml(item.next_action)}</p>
      </article>
    `)
    .join("");
}

function renderLoadingState() {
  const loadingCard = `<div class="kpi-card" style="opacity:0.5"><span>memuat...</span><strong>—</strong></div>`;
  kpi.innerHTML = loadingCard.repeat(4);
  automationStatus.innerHTML = `
    <article class="status-card warn">
      <small>Status</small>
      <strong>Loading...</strong>
      <p>Sedang membaca Airtable, queue sales, content, stock, dan order. Ini bisa 5–30 detik.</p>
    </article>
  `;
  apiProgress.textContent = "Checking...";
  roadmapProgress.textContent = "Checking...";
  if (ailogMeta) ailogMeta.textContent = "Menjalankan agents...";
  if (aiActivityLog) aiActivityLog.innerHTML = `<div class="ai-log-step loading"><span class="ai-log-agent">Workflow</span><span class="ai-log-detail">Agents sedang berjalan...</span></div>`;
  // clear stale sections so user doesn't see old data while refreshing
  [ownerBrief, dailyPlan, marketingPlan, leads, offers, pipeline, outreachQueue, content, procurement, packing, contracts].forEach(el => {
    if (el) el.innerHTML = `<article class="item" style="opacity:0.4"><p>Memuat...</p></article>`;
  });
}

function renderErrorState(error) {
  const message = error?.name === "AbortError"
    ? "Request dashboard timeout. Server masih jalan, tapi browser tidak menerima response dalam 15 detik."
    : error?.message || "Dashboard gagal load.";

  kpi.innerHTML = `<div class="kpi-card"><strong>!</strong><span>Needs attention</span></div>`;
  automationStatus.innerHTML = `
    <article class="status-card warn">
      <small>Dashboard Load</small>
      <strong>Needs Attention</strong>
      <p>${escapeHtml(message)}</p>
    </article>
  `;
  apiProgress.textContent = "Retry needed";
  roadmapProgress.textContent = "Retry needed";
  ownerBrief.innerHTML = `<article class="item"><p>${escapeHtml(message)}</p></article>`;
}

function renderApiConnections(integrations) {
  const services = integrations?.services || [];
  const summary = integrations?.summary || { connected: 0, total: services.length, blocked: services.length };
  apiProgress.textContent = `${summary.connected}/${summary.total} connected`;
  const sidebarStatus = document.getElementById("sidebarStatus");
  if (sidebarStatus) {
    const allOk = summary.blocked === 0;
    sidebarStatus.textContent = allOk
      ? `✓ ${summary.connected}/${summary.total} connected`
      : `${summary.connected}/${summary.total} · ${summary.blocked} blocked`;
    sidebarStatus.style.color = allOk ? "#7DCB9E" : "#F4A261";
  }
  apiConnections.innerHTML = services
    .map((item) => `
      <article class="api-card ${item.status}">
        <div class="content-meta">
          <strong>${escapeHtml(item.name)}</strong>
          <span class="badge ${item.status}">${escapeHtml(item.status)}</span>
        </div>
        <p>${escapeHtml(item.purpose)}</p>
        <small>${escapeHtml(item.message || "")}</small>
        ${(item.required_scopes || []).length ? `<small>${escapeHtml(`Scopes: ${item.required_scopes.join(" · ")}`)}</small>` : ""}
        <small>${escapeHtml((item.required_env || []).join(" · "))}</small>
        ${item.name === "WhatsApp" ? `<div class="actions"><button type="button" data-whatsapp-test>Test Send</button></div>` : ""}
      </article>
    `)
    .join("");

  apiConnections.querySelectorAll("[data-whatsapp-test]").forEach((button) => {
    button.addEventListener("click", () => testWhatsAppSend(button));
  });
}

async function testWhatsAppSend(trigger) {
  trigger.disabled = true;
  trigger.textContent = "Testing...";
  try {
    const response = await fetchWithTimeout("/api/whatsapp/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    }, 30000);
    const result = await response.json();
    window.alert(result.send_ready
      ? "WatZap test berhasil. Pesan test diterima provider."
      : `WatZap belum send-ready: ${result.provider_message || "WABA belum connected."}`);
    await runDaily();
  } finally {
    trigger.disabled = false;
    trigger.textContent = "Test Send";
  }
}

function renderRoadmapAndChecklist(data) {
  const roadmapItems = buildRoadmap(data);
  const checklistItems = buildMonitoringChecklist(data);
  const doneCount = checklistItems.filter((item) => item.status === "done").length;
  const totalCount = checklistItems.length;

  roadmapProgress.textContent = `${doneCount}/${totalCount} checklist done`;
  roadmap.innerHTML = roadmapItems
    .map((item) => `
      <article class="roadmap-card ${item.status}">
        <small>${escapeHtml(item.phase)}</small>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.detail)}</p>
        <span>${escapeHtml(statusLabel(item.status))}</span>
      </article>
    `)
    .join("");

  monitoringChecklist.innerHTML = checklistItems
    .map((item) => `
      <article class="check-item ${item.status}">
        <div class="check-mark">${item.status === "done" ? "OK" : item.status === "blocked" ? "!" : "..."}</div>
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.detail)}</p>
        </div>
      </article>
    `)
    .join("");
}

function buildRoadmap(data) {
  const whatsappConfigured = !hasWhatsAppApiBlock(data);
  const airtableLive = data.stateHealth?.source && data.stateHealth.source !== "csv";
  return [
    {
      phase: "Day 1-3",
      title: "Data Foundation",
      status: "done",
      detail: "Schema, CSV fallback, Airtable connector foundation, daily workflow."
    },
    {
      phase: "Day 4-6",
      title: "Sales Engine",
      status: "done",
      detail: "Lead scoring, offer matching, outreach queue, approval, WhatsApp guardrail."
    },
    {
      phase: "Day 7",
      title: "Content Factory",
      status: "done",
      detail: "IG/TikTok/WhatsApp drafts, UGC script, Canva workflow, AI image design, edit form, approval status."
    },
    {
      phase: "Day 8",
      title: "Publishing Connectors",
      status: "done",
      detail: "Connector upload/post status untuk social, marketplace, dan Shopify sudah siap di backend."
    },
    {
      phase: "Day 9",
      title: "Airtable Live Sync",
      status: airtableLive ? "done" : "blocked",
      detail: airtableLive ? "Live source aktif." : "Menunggu base/table Airtable tersambung."
    },
    {
      phase: "Day 10",
      title: "WhatsApp API Send",
      status: whatsappConfigured ? "current" : "blocked",
      detail: whatsappConfigured ? "API siap dites send." : "Menunggu Wablas/Zenziva API URL dan token."
    },
    {
      phase: "Day 11-12",
      title: "Order to Production",
      status: "next",
      detail: "Order approved ke invoice, packing queue, notifikasi produksi."
    },
    {
      phase: "Day 13-14",
      title: "Owner Control Tower",
      status: "next",
      detail: "Report harian, KPI revenue, conversion, stock movement, dan next action."
    }
  ];
}

function buildMonitoringChecklist(data) {
  const kpiData = data.kpi || {};
  const hasContent = Number(kpiData.contentQueue || 0) > 0;
  const hasOutreach = Number(kpiData.outreachQueue || 0) > 0;
  const hasPacking = Number(kpiData.packingQueue || 0) > 0;
  const hasProcurement = Number(kpiData.procurementAlerts || 0) > 0;
  const airtableLive = data.stateHealth?.source && data.stateHealth.source !== "csv";
  const whatsappConfigured = !hasWhatsAppApiBlock(data);
  const publishBlocked = (data.contentQueue || []).some((item) => item.publish_status === "blocked");
  const integrationBlocked = Number(data.integrations?.summary?.blocked || 0);

  return [
    {
      title: "Daily workflow berjalan",
      status: Number(kpiData.leadsLoaded || 0) > 0 ? "done" : "current",
      detail: `${kpiData.leadsLoaded || 0} leads loaded, ${kpiData.offersGenerated || 0} offers generated.`
    },
    {
      title: "Lead scoring aktif",
      status: Number(kpiData.hotLeads || 0) > 0 ? "done" : "current",
      detail: `${kpiData.hotLeads || 0} hot leads terbaca hari ini.`
    },
    {
      title: "Outreach queue aktif",
      status: hasOutreach ? "done" : "current",
      detail: `${kpiData.outreachQueue || 0} outreach menunggu review/send.`
    },
    {
      title: "WhatsApp guardrail aman",
      status: whatsappConfigured ? "done" : "blocked",
      detail: whatsappConfigured ? "API configured." : "Belum bisa send otomatis sebelum API dikonfigurasi."
    },
    {
      title: "Content Factory aktif",
      status: hasContent ? "done" : "current",
      detail: `${kpiData.contentQueue || 0} konten berada di queue.`
    },
    {
      title: "Konten bisa diedit owner",
      status: "done",
      detail: "Hook, caption, script, CTA, visual brief, dan status bisa diubah di dashboard."
    },
    {
      title: "Procurement alert aktif",
      status: hasProcurement ? "done" : "current",
      detail: `${kpiData.procurementAlerts || 0} stock/packaging alerts terdeteksi.`
    },
    {
      title: "Packing queue aktif",
      status: hasPacking ? "done" : "current",
      detail: `${kpiData.packingQueue || 0} order masuk queue produksi/packing.`
    },
    {
      title: "Airtable live sync",
      status: airtableLive ? "done" : "blocked",
      detail: airtableLive ? "App memakai Airtable/live source." : "Saat ini masih CSV fallback."
    },
    {
      title: "Publishing API",
      status: publishBlocked || integrationBlocked ? "blocked" : "done",
      detail: publishBlocked || integrationBlocked
        ? `${integrationBlocked} API/integrasi masih blocked.`
        : "Semua connector publish/status siap."
    }
  ];
}

function hasWhatsAppApiBlock(data) {
  return (data.outreachQueue || []).some((item) => (item.guardrail?.reasons || []).includes("WhatsApp API belum dikonfigurasi."));
}

function statusLabel(status) {
  return { done: "Done", current: "In Progress", next: "Next", blocked: "Blocked" }[status] || status;
}

function toggleContentEditor(contentId) {
  const form = document.querySelector(`[data-content-form="${cssEscape(contentId)}"]`);
  if (!form) return;
  form.hidden = !form.hidden;
}

function renderContentFactory(data) {
  const queue = data.contentQueue || [];
  const ugc = data.content?.ugc_owner_script || {};
  const canvaStatus = getCanvaStatus(data);
  const queueHtml = queue.length
    ? queue
        .map((item) => `
          <article class="item content-card">
            <div class="content-meta">
              <strong>${escapeHtml(item.channel)} · ${escapeHtml(item.content_type)}</strong>
              <span class="badge ${item.status}">${escapeHtml(item.status)}</span>
            </div>
            <small>${escapeHtml([item.date, item.objective, item.product_focus].filter(Boolean).join(" · "))}</small>
            <h3>${escapeHtml(item.hook || item.brief || "Draft konten")}</h3>
            <p>${escapeHtml(item.caption_draft || "Caption belum dibuat.")}</p>
            ${item.script_draft ? `<pre class="script">${escapeHtml(item.script_draft)}</pre>` : ""}
            ${item.visual_brief ? `<small>${escapeHtml(`Visual: ${item.visual_brief}`)}</small>` : ""}
            ${renderDesignAsset(item)}
            ${item.cta ? `<p><strong>CTA:</strong> ${escapeHtml(item.cta)}</p>` : ""}
            ${renderCanvaWorkflow(item, canvaStatus)}
            ${renderPublishStatus(item)}
            <div class="actions">
              <button type="button" data-content-edit="${escapeHtml(item.content_id)}">Edit</button>
              <button type="button" data-content-action="design" data-content-id="${escapeHtml(item.content_id)}">AI Design</button>
              <button type="button" data-content-action="canva" data-content-id="${escapeHtml(item.content_id)}">Export to Canva</button>
              <button type="button" data-content-action="approve" data-content-id="${escapeHtml(item.content_id)}">Approve</button>
              <button type="button" data-content-action="schedule" data-content-id="${escapeHtml(item.content_id)}">Schedule</button>
              <button type="button" data-content-action="publish" data-content-id="${escapeHtml(item.content_id)}">Publish via API</button>
              <button type="button" data-content-action="reject" data-content-id="${escapeHtml(item.content_id)}" class="secondary">Revise</button>
            </div>
            ${renderContentEditor(item)}
          </article>
        `)
        .join("")
    : `<article class="item"><p>Belum ada content queue. Klik Generate Content.</p></article>`;

  return `
    ${renderCanvaQueuePanel(canvaStatus)}
    <article class="item accent content-card">
      <strong>UGC Owner Script</strong>
      <small>${escapeHtml([ugc.duration_seconds ? `${ugc.duration_seconds} detik` : "", data.content?.product_focus].filter(Boolean).join(" · "))}</small>
      <h3>${escapeHtml(ugc.title || "Script UGC belum dibuat")}</h3>
      <p>${escapeHtml(ugc.teleprompter || "Klik Generate Content untuk membuat script talking head.")}</p>
    </article>
    ${queueHtml}
  `;
}

function getCanvaStatus(data) {
  const instagram = (data.integrations?.services || []).find((item) => item.name === "Instagram");
  const queueUrl = (data.contentQueue || []).find((item) => item.publish_status === "canva_workflow" && item.url)?.url || "";
  return {
    enabled: instagram?.configured || false,
    status: queueUrl ? "ready" : "needs_queue_url",
    queue_url: queueUrl,
    message: queueUrl
      ? "Canva queue/folder tersedia dari content yang sudah diexport."
      : "Canva workflow aktif, tapi link folder/queue belum diisi."
  };
}

function renderCanvaQueuePanel(canvaStatus) {
  return `
    <article class="item canva-panel ${escapeHtml(canvaStatus.status)}">
      <div class="content-meta">
        <strong>Canva Workflow</strong>
        <span class="badge ${canvaStatus.status === "ready" ? "connected" : "blocked"}">${escapeHtml(canvaStatus.status)}</span>
      </div>
      <p>${escapeHtml(canvaStatus.message)}</p>
      ${canvaStatus.queue_url
        ? `<a href="${escapeHtml(canvaStatus.queue_url)}" target="_blank" rel="noreferrer">Open Canva Queue / Folder</a>`
        : `<small>Isi ` + "`CANVA_CONTENT_QUEUE_URL`" + ` di env atau paste link saat klik Export to Canva.</small>`}
    </article>
  `;
}

function renderCanvaWorkflow(item, canvaStatus) {
  const isCanvaChannel = /instagram|tiktok/i.test(item.channel || "");
  const isExported = item.status === "exported_to_canva" || item.publish_status === "canva_workflow";
  if (!isCanvaChannel && !isExported) return "";
  const url = item.url || canvaStatus.queue_url || "";
  const tone = isExported ? "exported" : "pending";
  return `
    <div class="canva-workflow ${tone}">
      <div class="content-meta">
        <strong>${isExported ? "Canva: Exported" : "Canva: Waiting Export"}</strong>
        <span class="badge ${isExported ? "exported_to_canva" : "needs_approval"}">${isExported ? "ready in workflow" : "not exported"}</span>
      </div>
      <p>${escapeHtml(isExported
        ? item.publish_message || "Asset/caption sudah ditandai masuk Canva workflow."
        : "Klik Export to Canva setelah caption dan visual brief siap.")}</p>
      ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Open Canva Queue / Folder</a>` : `<small>Belum ada link Canva untuk item ini.</small>`}
    </div>
  `;
}

function renderDesignAsset(item) {
  if (!item.design_prompt && !item.image_url && !item.design_status) return "";
  return `
    <div class="design-asset ${escapeHtml(item.design_status || "draft")}">
      <div class="content-meta">
        <strong>${escapeHtml(`OpenAI Design: ${item.design_status || "draft"}`)}</strong>
        ${item.image_url ? `<a href="${escapeHtml(item.image_url)}" target="_blank" rel="noreferrer">Open PNG</a>` : ""}
      </div>
      ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.hook || "OpenAI generated content design")}" />` : ""}
      ${item.design_message ? `<p>${escapeHtml(item.design_message)}</p>` : ""}
      ${item.design_prompt ? `<details><summary>Prompt desain</summary><pre class="script">${escapeHtml(item.design_prompt)}</pre></details>` : ""}
    </div>
  `;
}

function renderPublishStatus(item) {
  if (!item.publish_status && !item.published_at && !item.url) return "";
  return `
    <div class="publish-status ${escapeHtml(item.publish_status || "pending")}">
      <strong>${escapeHtml(`Publish: ${item.publish_status || "pending"}`)}</strong>
      ${item.publish_message ? `<p>${escapeHtml(item.publish_message)}</p>` : ""}
      ${item.url ? `<small>${escapeHtml(item.url)}</small>` : ""}
      ${item.published_at ? `<small>${escapeHtml(`Published at ${item.published_at}`)}</small>` : ""}
    </div>
  `;
}

function renderContentEditor(item) {
  const statusOptions = ["draft", "needs_approval", "approved", "exported_to_canva", "scheduled", "published"]
    .map((status) => `<option value="${status}"${item.status === status ? " selected" : ""}>${status}</option>`)
    .join("");

  return `
    <form class="edit-form" data-content-form="${escapeHtml(item.content_id)}" hidden>
      <input type="hidden" name="content_id" value="${escapeHtml(item.content_id)}" />
      <label>
        <span>Objective</span>
        <input name="objective" value="${escapeHtml(item.objective || "")}" />
      </label>
      <label>
        <span>Product Focus</span>
        <input name="product_focus" value="${escapeHtml(item.product_focus || "")}" />
      </label>
      <label>
        <span>Hook</span>
        <textarea name="hook" rows="2">${escapeHtml(item.hook || item.brief || "")}</textarea>
      </label>
      <label>
        <span>Caption</span>
        <textarea name="caption_draft" rows="5">${escapeHtml(item.caption_draft || "")}</textarea>
      </label>
      <label>
        <span>Script</span>
        <textarea name="script_draft" rows="6">${escapeHtml(item.script_draft || "")}</textarea>
      </label>
      <label>
        <span>CTA</span>
        <input name="cta" value="${escapeHtml(item.cta || "")}" />
      </label>
      <label>
        <span>Visual Brief</span>
        <textarea name="visual_brief" rows="3">${escapeHtml(item.visual_brief || "")}</textarea>
      </label>
      <label>
        <span>Status</span>
        <select name="status">${statusOptions}</select>
      </label>
      <div class="actions">
        <button type="submit">Save Changes</button>
        <button type="button" class="secondary" data-content-edit="${escapeHtml(item.content_id)}">Close</button>
      </div>
    </form>
  `;
}

function renderAutomationStatus(data) {
  const stateHealth = data.stateHealth || {};
  const queue = data.outreachQueue || [];
  const blocked = queue.filter((item) => item.guardrail && !item.guardrail.allowed).length;
  const ready = queue.filter((item) => item.guardrail?.allowed).length;
  const missingApi = queue.some((item) => (item.guardrail?.reasons || []).includes("WhatsApp API belum dikonfigurasi."));
  const approved = queue.filter((item) => item.status === "approved").length;

  const cards = [
    {
      label: "Data Source",
      status: stateHealth.source === "csv" ? "CSV aktif" : stateHealth.source || "Unknown",
      tone: stateHealth.source === "csv" ? "warn" : "ok",
      detail: stateHealth.source === "csv"
        ? "Airtable belum tersambung, app memakai data lokal agar workflow tetap jalan."
        : "Airtable/live source aktif."
    },
    {
      label: "WhatsApp Guardrail",
      status: missingApi ? "API belum connect" : `${ready} ready / ${blocked} blocked`,
      tone: missingApi || blocked ? "warn" : "ok",
      detail: "Send hanya jalan kalau lead approved, nomor tersedia, daily cap aman, dan API aktif."
    },
    {
      label: "Sales Approval",
      status: `${approved} approved`,
      tone: approved ? "ok" : "warn",
      detail: `${queue.length} outreach berada di queue review/approval/send.`
    },
    {
      label: "AI Modules",
      status: "9 modul aktif",
      tone: "ok",
      detail: "Daily brief, scoring, offer, content, pipeline, procurement, contract, invoice, packing."
    }
  ];

  return cards
    .map((card) => `
      <article class="status-card ${card.tone}">
        <small>${escapeHtml(card.label)}</small>
        <strong>${escapeHtml(card.status)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `)
    .join("");
}

function renderGuardrail(guardrail = {}) {
  const status = guardrail.allowed ? "Ready to send" : "Blocked";
  const details = [...(guardrail.reasons || []), ...(guardrail.warnings || [])];
  return `
    <div class="guardrail ${guardrail.allowed ? "ok" : "blocked"}">
      <strong>${escapeHtml(status)}</strong>
      <small>${escapeHtml(`Sent today ${guardrail.sent_today ?? 0}/${guardrail.daily_cap ?? 50}`)}</small>
      ${details.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
    </div>
  `;
}

function renderOwnerBrief(brief) {
  if (!brief.owner_summary) {
    return `<article class="item"><p>Daily brief belum tersedia.</p></article>`;
  }
  return `
    <article class="item accent">
      <strong>${escapeHtml(brief.priority_product || "Prioritas belum dipilih")}</strong>
      <p>${escapeHtml(brief.owner_summary)}</p>
    </article>
    <div class="brief-grid">
      <article class="item">
        <strong>Outreach</strong>
        ${(brief.outreach_tasks || []).map((task) => `<p>${escapeHtml(task)}</p>`).join("")}
      </article>
      <article class="item">
        <strong>Content</strong>
        ${(brief.content_tasks || []).map((task) => `<p>${escapeHtml(task)}</p>`).join("")}
      </article>
      <article class="item">
        <strong>Stock Alerts</strong>
        ${(brief.stock_alerts || []).slice(0, 5).map((task) => `<p>${escapeHtml(task)}</p>`).join("") || "<p>Aman.</p>"}
      </article>
      <article class="item">
        <strong>Besok</strong>
        <p>${escapeHtml(brief.tomorrow_focus || "")}</p>
      </article>
    </div>
  `;
}

function renderAgentLog(agentLog) {
  if (!aiActivityLog || !agentLog) return;
  const { ran_at, total_ms, steps = [] } = agentLog;
  const ranAt = ran_at ? new Date(ran_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
  const totalSec = total_ms ? (total_ms / 1000).toFixed(1) : "—";
  if (ailogMeta) ailogMeta.textContent = `Selesai ${ranAt} · ${totalSec}s total`;

  aiActivityLog.innerHTML = steps.map((step) => {
    const ms = step.ms != null ? `${step.ms}ms` : "";
    const statusClass = step.status === "error" ? "error" : step.ms > 2000 ? "slow" : "ok";
    const icon = step.status === "error" ? "✕" : step.ms > 2000 ? "⏱" : "✓";
    return `
      <div class="ai-log-step ${statusClass}">
        <span class="ai-log-icon">${icon}</span>
        <span class="ai-log-agent">${escapeHtml(step.agent)}</span>
        <span class="ai-log-detail">${escapeHtml(step.detail || "")}</span>
        <span class="ai-log-ms">${ms}</span>
      </div>
    `;
  }).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replaceAll('"', '\\"');
}
