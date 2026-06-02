const channelConfig = {
  instagram: {
    label: "Instagram",
    url: "INSTAGRAM_API_URL",
    token: "INSTAGRAM_API_TOKEN",
    canvaWorkflow: true
  },
  tiktok: {
    label: "TikTok",
    url: "TIKTOK_API_URL",
    token: "TIKTOK_API_TOKEN",
    canvaWorkflow: true
  },
  "shopify blog": {
    label: "Shopify Blog",
    url: "SHOPIFY_ADMIN_API_URL",
    token: "SHOPIFY_ADMIN_API_TOKEN"
  },
  whatsapp: {
    label: "WhatsApp",
    url: "WHATSAPP_API_URL",
    token: "WHATSAPP_API_TOKEN"
  }
};

export async function publishContent(content) {
  const config = resolveConfig(content.channel);
  if (!config) {
    return blockedResult(content, `Connector untuk channel ${content.channel || "unknown"} belum tersedia.`);
  }

  const apiUrl = process.env[config.url];
  const apiToken = process.env[config.token];
  if (config.canvaWorkflow && isCanvaWorkflowEnabled()) {
    return {
      published: false,
      status: "canva_workflow",
      message: `${config.label} dikelola via Canva Content Planner. Export asset/caption ke Canva, lalu schedule/publish dari Canva.`,
      url: process.env.CANVA_CONTENT_QUEUE_URL || content.url || ""
    };
  }

  if (!apiUrl || !apiToken) {
    return blockedResult(content, `${config.label} API belum dikonfigurasi (${config.url}/${config.token}).`);
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`
    },
    body: JSON.stringify({
      content_id: content.content_id,
      channel: content.channel,
      content_type: content.content_type,
      product_focus: content.product_focus,
      hook: content.hook,
      caption: content.caption_draft,
      script: content.script_draft,
      cta: content.cta,
      visual_brief: content.visual_brief
    })
  });

  if (!response.ok) {
    return {
      published: false,
      status: "failed",
      message: `${config.label} API error ${response.status}: ${await response.text()}`,
      url: ""
    };
  }

  const payload = await response.json();
  return {
    published: true,
    status: "published",
    message: payload.message || `${config.label} publish accepted.`,
    url: payload.url || payload.published_url || ""
  };
}

export function getPublishingConnectorStatus() {
  return Object.values(channelConfig).map((config) => {
    const canvaEnabled = config.canvaWorkflow && isCanvaWorkflowEnabled();
    if (config.label === "WhatsApp" && process.env.WHATSAPP_PROVIDER === "watzap") {
      return {
        channel: config.label,
        configured: Boolean(process.env.WATZAP_API_KEY && process.env.WATZAP_NUMBER_KEY),
        status: "blocked",
        message: "WatZap belum send-ready; lihat kartu WhatsApp utama dan jalankan Test Send.",
        required_env: ["WATZAP_API_KEY", "WATZAP_NUMBER_KEY"]
      };
    }
    return {
      channel: config.label,
      configured: canvaEnabled || Boolean(process.env[config.url] && process.env[config.token]),
      status: canvaEnabled ? "connected" : undefined,
      message: canvaEnabled ? "Canva workflow aktif untuk upload/schedule/publish." : undefined,
      required_env: canvaEnabled ? ["CANVA_WORKFLOW_ENABLED", "CANVA_CONTENT_QUEUE_URL"] : [config.url, config.token]
    };
  });
}

function resolveConfig(channel = "") {
  return channelConfig[String(channel).toLowerCase()];
}

function blockedResult(content, message) {
  return {
    published: false,
    status: "blocked",
    message,
    url: content.url || ""
  };
}

function isCanvaWorkflowEnabled() {
  return String(process.env.CANVA_WORKFLOW_ENABLED || "").toLowerCase() === "true";
}
import { readLastWatZapSendStatus } from "../services/whatsappValidationService.js";
