import { toNumber } from "../lib/csv.js";

export function createPipelinePlan(leads, offers) {
  return leads.slice(0, 30).map((lead) => {
    const offer = offers.find((item) => item.lead_id === lead.lead_id);
    const score = toNumber(lead.lead_score);
    return {
      lead_id: lead.lead_id,
      nama_cafe: lead.nama_cafe,
      stage: stageForLead(lead, score),
      priority: score >= 80 ? "P1" : score >= 60 ? "P2" : "P3",
      next_action: nextAction(lead, score),
      offer_type: offer?.offer_type || offerType(score, lead),
      product_offer: offer?.product_name || "Classic Blend",
      match_reason: offer?.match_reason || lead.score_reasons?.[0] || "",
      risk_flags: lead.risk_flags || [],
      suggested_message: offer?.message || "Kirim intro WILLKIN + offer sample 300g.",
      followup_due: lead.next_followup_date || new Date().toISOString().slice(0, 10)
    };
  });
}

function stageForLead(lead, score) {
  if (/sample/i.test(lead.status || lead.next_action || "")) return "Sample requested";
  if (score >= 80) return "Qualified";
  if (score >= 60) return "New lead";
  return "Nurture";
}

function nextAction(_lead, score) {
  if (score >= 80) return "Outreach personal hari ini dan tawarkan sample 300g.";
  if (score >= 60) return "Masukkan sequence edukasi cost per cup, follow-up H+3.";
  return "Simpan untuk nurturing konten, jangan dikejar agresif.";
}

function offerType(score, lead) {
  const text = Object.values(lead).join(" ").toLowerCase();
  if (/hotel|franchise|chain|group/.test(text) || score >= 90) return "Ready stock + proposal kontrak 3 bulan";
  if (/opening|baru/.test(text)) return "Sample 300g + trial 1kg";
  return "Ready stock + sample 300g";
}
