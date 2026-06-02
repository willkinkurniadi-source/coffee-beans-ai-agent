import { getPublishingConnectorStatus } from "../connectors/publishingClient.js";
import { fetchAirtableTable, isAirtableConfigured } from "../connectors/airtableClient.js";
import { checkGoogleSheetsAccess, isGoogleSheetsConfigured } from "../connectors/googleSheetsClient.js";
import { checkWatzapKey, isWatzapConfigured } from "../connectors/watzapClient.js";
import { readLastWatZapSendStatus } from "./whatsappValidationService.js";

const githubRepoUrl = "https://github.com/willkinkurniadi-source/coffee-beans-ai-agent";
const githubRepoApiUrl = "https://api.github.com/repos/willkinkurniadi-source/coffee-beans-ai-agent/commits/main";

export async function getIntegrationStatus() {
  const publishing = getPublishingConnectorStatus();
  const github = await checkGithubRepository();
  const airtable = await checkAirtableConnection();
  const publishingServices = await Promise.all(
    publishing.map((item) =>
      item.channel === "Shopify Blog"
        ? checkShopifyConnection(item)
        : service({
        name: item.channel,
        purpose: `Publish/status connector for ${item.channel}.`,
        configured: item.configured,
        status: item.status,
        message: item.message,
        required_env: item.required_env,
        missing_message: `${item.channel} publishing belum tersambung.`
      })
    )
  );
  const services = [
    github,
    service({
      name: "OpenAI",
      purpose: "AI copywriting, lead reasoning, sales chat, and OpenAI-generated social media design assets.",
      configured: Boolean(process.env.OPENAI_API_KEY),
      required_env: ["OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_IMAGE_MODEL"],
      missing_message: "OPENAI_API_KEY belum diisi; copy/design masih memakai prompt lokal tanpa image generation."
    }),
    airtable,
    await checkWhatsAppConnection(),
    service({
      name: "Scraper",
      purpose: "Daily cafe prospect discovery.",
      configured: Boolean(process.env.SCRAPER_API_URL && process.env.SCRAPER_API_TOKEN),
      required_env: ["SCRAPER_API_URL", "SCRAPER_API_TOKEN"],
      missing_message: "Scraper API belum tersambung; lead scraping masih mock/manual CSV."
    }),
    await checkTelegramConnection(),
    await checkGoogleSheetsConnection(),
    ...publishingServices
  ];

  const connected = services.filter((item) => item.status === "connected").length;
  const blocked = services.filter((item) => item.status === "blocked").length;

  return {
    checked_at: new Date().toISOString(),
    summary: {
      total: services.length,
      connected,
      blocked,
      ready_for_live_automation: blocked === 0
    },
    services
  };
}

async function checkWhatsAppConnection() {
  if (process.env.WHATSAPP_PROVIDER === "watzap" || isWatzapConfigured()) {
    const base = {
      name: "WhatsApp",
      purpose: "B2B cafe outreach send and follow-up automation via WatZap.",
      required_env: ["WATZAP_API_KEY", "WATZAP_NUMBER_KEY"]
    };
    try {
      const result = await checkWatzapKey();
      if (!result.ok) {
        return service({
          ...base,
          configured: false,
          status: "blocked",
          message: result.message
        });
      }
      const hasNumberKey = Boolean(process.env.WATZAP_NUMBER_KEY || process.env.WHATSAPP_NUMBER_KEY);
      const sendStatus = await readLastWatZapSendStatus();
      const sendReady = Boolean(hasNumberKey && sendStatus?.send_ready);
      return service({
        ...base,
        configured: hasNumberKey,
        status: sendReady ? "connected" : "blocked",
        message: !hasNumberKey
          ? `WatZap API valid. ${result.plan || "Plan active"} · perlu WATZAP_NUMBER_KEY untuk send.`
          : sendReady
            ? `WatZap send-ready. Test terakhir berhasil ${sendStatus.checked_at}. ${result.plan || "Plan active"} · ${result.expires_on || ""}`
            : `WatZap API valid, tapi send belum verified. ${
                sendStatus?.provider_message || "Klik test send; WABA harus connected di WatZap."
              }`
      });
    } catch (error) {
      return service({
        ...base,
        configured: false,
        status: "blocked",
        message: `WatZap check unavailable: ${error.message}`
      });
    }
  }

  return service({
    name: "WhatsApp",
    purpose: "B2B cafe outreach send and follow-up automation.",
    configured: Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN),
    required_env: ["WHATSAPP_API_URL", "WHATSAPP_API_TOKEN"],
    missing_message: "WhatsApp API belum tersambung; send diblok guardrail."
  });
}

async function checkGoogleSheetsConnection() {
  const base = {
    name: "Google Sheets",
    purpose: "Operational export/sync for owner reporting, stock movement, and finance backup.",
    required_env: ["GOOGLE_SHEETS_ID", "GOOGLE_SERVICE_ACCOUNT_JSON"]
  };

  if (!isGoogleSheetsConfigured()) {
    return service({
      ...base,
      configured: false,
      message: "Google Sheets ID/service account belum lengkap."
    });
  }

  try {
    const result = await checkGoogleSheetsAccess();
    if (!result.ok) {
      return service({
        ...base,
        configured: false,
        status: "blocked",
        message: result.message
      });
    }
    return service({
      ...base,
      configured: true,
      status: "connected",
      message: `Connected to ${result.title}. Sheets: ${(result.sheets || []).slice(0, 4).join(", ") || "none listed"}.`
    });
  } catch (error) {
    return service({
      ...base,
      configured: false,
      status: "blocked",
      message: `Google Sheets check failed: ${error.message}`
    });
  }
}

async function checkTelegramConnection() {
  const base = {
    name: "Telegram",
    purpose: "Owner and production notifications for daily brief, packing, and alerts.",
    required_env: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_OWNER_CHAT_ID"]
  };

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return service({
      ...base,
      configured: false,
      message: "Telegram bot token belum diisi."
    });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`, {
      signal: AbortSignal.timeout(7000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      return service({
        ...base,
        configured: false,
        status: "blocked",
        message: `Telegram bot test failed: ${payload.description || response.status}`
      });
    }

    const username = payload.result?.username ? `@${payload.result.username}` : "bot";
    const chatStatus = process.env.TELEGRAM_OWNER_CHAT_ID ? "Owner chat ID configured." : "Owner chat ID belum diisi; bot valid tapi belum bisa kirim notifikasi owner.";
    return service({
      ...base,
      configured: Boolean(process.env.TELEGRAM_OWNER_CHAT_ID),
      status: process.env.TELEGRAM_OWNER_CHAT_ID ? "connected" : "blocked",
      message: `${username} valid. ${chatStatus}`
    });
  } catch (error) {
    return service({
      ...base,
      configured: false,
      status: "blocked",
      message: `Telegram check unavailable: ${error.message}`
    });
  }
}

async function checkShopifyConnection(item) {
  const base = {
    name: item.channel,
    purpose: "Publish/status connector for Shopify Blog.",
    required_env: [...item.required_env, "SHOPIFY_STORE_DOMAIN"]
  };

  if (!process.env.SHOPIFY_ADMIN_API_TOKEN || !process.env.SHOPIFY_STORE_DOMAIN) {
    return service({
      ...base,
      configured: false,
      message: process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET
        ? "Shopify API key/secret sudah tersimpan, tetapi Admin API access token belum ada. Butuh token yang biasanya diawali shpat_."
        : "Shopify Admin token/domain belum tersambung."
    });
  }

  try {
    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const response = await fetch(`https://${shopDomain}/admin/api/2024-10/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_API_TOKEN
      },
      signal: AbortSignal.timeout(7000)
    });
    if (!response.ok) {
      return service({
        ...base,
        configured: false,
        status: "blocked",
        message: `Shopify Admin API test failed: ${response.status}. API key/secret bukan Admin API access token; butuh token dari custom app Admin API access token.`
      });
    }
    return service({
      ...base,
      configured: true,
      status: "connected",
      message: `Connected to ${shopDomain}.`
    });
  } catch (error) {
    return service({
      ...base,
      configured: false,
      status: "blocked",
      message: `Shopify Admin API check unavailable: ${error.message}`
    });
  }
}

async function checkAirtableConnection() {
  const base = {
    name: "Airtable",
    purpose: "Live database for stock, leads, outreach, orders, content calendar, and production.",
    required_env: ["AIRTABLE_API_KEY", "AIRTABLE_BASE_ID", "DATA_SOURCE=airtable"],
    required_scopes: ["data.records:read", "data.records:write", "schema.bases:read"]
  };

  if (!isAirtableConfigured()) {
    return service({
      ...base,
      configured: false,
      message: "Airtable belum tersambung; isi AIRTABLE_API_KEY dan AIRTABLE_BASE_ID."
    });
  }

  try {
    const table = process.env.AIRTABLE_TABLE_PRODUCTS || "Products";
    const result = await fetchAirtableTable(table, { pageSize: 1 });
    return service({
      ...base,
      configured: true,
      status: "connected",
      message: `Connected. Base ${process.env.AIRTABLE_BASE_ID}, table ${table}, sample records ${result.records?.length || 0}.`
    });
  } catch (error) {
    return service({
      ...base,
      configured: false,
      status: "blocked",
      message: `Airtable test failed: ${error.message}`
    });
  }
}

async function checkGithubRepository() {
  try {
    const response = await fetch(githubRepoApiUrl, {
      headers: { "User-Agent": "willkin-coffee-agent" },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
      return service({
        name: "GitHub",
        purpose: "Source code repository and deployment handoff.",
        configured: false,
        required_env: ["GITHUB_REPO_URL"],
        status: "blocked",
        message: `GitHub check failed: ${response.status}`
      });
    }
    const payload = await response.json();
    return service({
      name: "GitHub",
      purpose: "Source code repository and deployment handoff.",
      configured: true,
      required_env: ["GITHUB_REPO_URL"],
      status: "connected",
      message: `${process.env.GITHUB_REPO_URL || githubRepoUrl} · latest ${String(payload.sha || "").slice(0, 7)} · ${payload.commit?.message || "commit detected"}`
    });
  } catch (error) {
    return service({
      name: "GitHub",
      purpose: "Source code repository and deployment handoff.",
      configured: false,
      required_env: ["GITHUB_REPO_URL"],
      status: "blocked",
      message: `GitHub check unavailable: ${error.message}`
    });
  }
}

function service({ name, purpose, configured, required_env, status, message, missing_message }) {
  return {
    name,
    purpose,
    required_env,
    required_scopes: arguments[0].required_scopes || [],
    configured,
    status: status || (configured ? "connected" : "blocked"),
    message: message || (configured ? "Configured." : missing_message)
  };
}
