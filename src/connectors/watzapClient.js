const baseUrl = "https://api.watzap.id/v1";

export function isWatzapConfigured() {
  return Boolean(process.env.WATZAP_API_KEY || process.env.WHATSAPP_API_TOKEN);
}

export async function checkWatzapKey() {
  const apiKey = process.env.WATZAP_API_KEY || process.env.WHATSAPP_API_TOKEN;
  if (!apiKey) {
    return {
      ok: false,
      message: "WATZAP_API_KEY belum diisi."
    };
  }

  const response = await fetch(`${baseUrl}/checking_key`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      api_key: apiKey,
      host: process.env.WATZAP_HOST || "willkincoffee.id"
    }),
    signal: AbortSignal.timeout(8000)
  });

  const payload = await response.json().catch(async () => ({ raw: await response.text() }));
  if (!response.ok || payload.status === false) {
    return {
      ok: false,
      message: `WatZap check failed: ${payload.message || response.status}`
    };
  }

  return {
    ok: true,
    name: payload.data?.name || "",
    plan: payload.data?.plan || "",
    expires_on: payload.data?.expires_on || "",
    licenses: payload.data?.licenses_key || []
  };
}

export async function sendWatzapMessage({ to, message }) {
  const apiKey = process.env.WATZAP_API_KEY || process.env.WHATSAPP_API_TOKEN;
  const numberKey = process.env.WATZAP_NUMBER_KEY || process.env.WHATSAPP_NUMBER_KEY;
  if (!apiKey || !numberKey) {
    return {
      mocked: true,
      status: "not_sent_missing_watzap_number_key",
      message: "WATZAP_API_KEY atau WATZAP_NUMBER_KEY belum lengkap."
    };
  }

  const response = await fetch(`${baseUrl}/waba_send_message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      api_key: apiKey,
      number_key: numberKey,
      phone_no: normalizePhone(to),
      message
    }),
    signal: AbortSignal.timeout(12000)
  });

  const payload = await response.json().catch(async () => ({ raw: await response.text() }));
  if (!response.ok || payload.status === false) {
    throw new Error(`WatZap API error ${response.status}: ${payload.message || JSON.stringify(payload)}`);
  }

  return payload;
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d]/g, "").replace(/^0/, "62");
}
