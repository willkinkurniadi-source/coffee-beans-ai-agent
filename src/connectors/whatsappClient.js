import { sendWatzapMessage } from "./watzapClient.js";

export async function sendWhatsAppMessage({ to, message }) {
  if (process.env.WHATSAPP_PROVIDER === "watzap") {
    return sendWatzapMessage({ to, message });
  }

  if (!process.env.WHATSAPP_API_URL || !process.env.WHATSAPP_API_TOKEN) {
    return {
      mocked: true,
      to,
      message,
      status: "not_sent_missing_whatsapp_api"
    };
  }

  const response = await fetch(process.env.WHATSAPP_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`
    },
    body: JSON.stringify({ to, message })
  });

  if (!response.ok) {
    throw new Error(`WhatsApp API error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}
