import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sendWatzapMessage } from "../connectors/watzapClient.js";

const statusPath = join(process.cwd(), "data", "watzap_send_status.json");

export async function sendWatZapTestMessage({ to, message } = {}) {
  const target = normalizePhone(to || process.env.WATZAP_TEST_PHONE || process.env.WHATSAPP_TEST_PHONE || "6289696756009");
  const text =
    message ||
    `WILLKIN Coffee Roastery - test validasi WatZap dari AI Growth OS. Mohon abaikan. ${new Date().toISOString()}`;

  const checkedAt = new Date().toISOString();
  try {
    const result = await sendWatzapMessage({ to: target, message: text });
    const status = {
      ok: true,
      send_ready: true,
      target,
      checked_at: checkedAt,
      provider_status: result.status ?? result.ack ?? "sent",
      provider_message: result.message || "WatZap accepted the test message.",
      provider_result: summarizeProviderResult(result)
    };
    await writeLastWatZapSendStatus(status);
    return status;
  } catch (error) {
    const status = {
      ok: false,
      send_ready: false,
      target,
      checked_at: checkedAt,
      provider_status: classifyWatZapError(error.message),
      provider_message: sanitizeError(error.message)
    };
    await writeLastWatZapSendStatus(status);
    return status;
  }
}

export async function readLastWatZapSendStatus() {
  try {
    return JSON.parse(await readFile(statusPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeLastWatZapSendStatus(status) {
  await writeFile(statusPath, JSON.stringify(status, null, 2), "utf8");
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d]/g, "").replace(/^0/, "62");
}

function sanitizeError(message) {
  return String(message || "")
    .replace(/api_key["']?\s*:\s*["'][^"']+/gi, "api_key: ***")
    .replace(/number_key["']?\s*:\s*["'][^"']+/gi, "number_key: ***");
}

function classifyWatZapError(message) {
  if (/connect whatsapp business api/i.test(message)) return "waba_not_connected";
  if (/number_key/i.test(message)) return "number_key_invalid";
  if (/invalid key|api key/i.test(message)) return "api_key_invalid";
  return "send_failed";
}

function summarizeProviderResult(result = {}) {
  return {
    status: result.status ?? "",
    ack: result.ack ?? "",
    message: result.message ?? "",
    id: result.id ?? result.message_id ?? result.data?.id ?? ""
  };
}
