export function evaluateWhatsAppGuardrail({ outreach, state }) {
  const lead = (state.leads || []).find((item) => item.lead_id === outreach.lead_id);
  const sentToday = (state.outreachLog || []).filter((item) => String(item.sent_at || "").slice(0, 10) === today()).length;
  const dailyCap = Number(process.env.WHATSAPP_DAILY_CAP || 50);
  const reasons = [];
  const warnings = [];

  if (!lead) reasons.push("Lead tidak ditemukan.");
  if (lead?.no_contact) reasons.push("Lead masuk no-contact list.");
  if (outreach.status !== "approved") reasons.push("Outreach belum approved.");
  if (!outreach.message_draft) reasons.push("Message draft kosong.");
  if (sentToday >= dailyCap) reasons.push(`Daily cap WhatsApp tercapai (${dailyCap}/hari).`);

  const to = lead?.wa_number || lead?.phone || "";
  if (!to) reasons.push("Nomor WhatsApp/phone belum tersedia.");
  if (outreach.channel !== "WhatsApp") warnings.push(`Channel saat ini '${outreach.channel}', perlu WhatsApp-ready contact.`);
  if (!process.env.WHATSAPP_API_URL || !process.env.WHATSAPP_API_TOKEN) reasons.push("WhatsApp API belum dikonfigurasi.");
  if (/diskon|discount|gratis ongkir|kontrak|payment term|tempo|jamin|pasti kirim/i.test(outreach.message_draft || "")) {
    warnings.push("Pesan mengandung klaim/term sensitif; perlu review owner.");
  }

  return {
    outreach_id: outreach.outreach_id,
    lead_id: outreach.lead_id,
    allowed: reasons.length === 0,
    to,
    daily_cap: dailyCap,
    sent_today: sentToday,
    reasons,
    warnings,
    checked_at: new Date().toISOString()
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
