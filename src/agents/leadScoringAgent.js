import { toNumber } from "../lib/csv.js";

export function scoreLeads(leads, stock = []) {
  return leads
    .map((lead) => {
      const scorecard = scoreLead(lead, stock);
      const score = toNumber(lead.lead_score || lead.score, 0) || scorecard.score;
      const lead_score = Math.max(0, Math.min(100, score));
      return {
        ...lead,
        lead_score,
        score_segment: segmentFromScore(lead_score),
        score_breakdown: scorecard.breakdown,
        score_reasons: scorecard.reasons,
        risk_flags: scorecard.risk_flags,
        status: normalizeStatus(lead.status, lead_score),
        next_action: lead.next_action || actionFromScore(lead_score, scorecard)
      };
    })
    .sort((a, b) => b.lead_score - a.lead_score);
}

export function scoreLead(lead, stock = []) {
  const text = Object.values(lead).join(" ").toLowerCase();
  const breakdown = {};
  const reasons = [];
  const riskFlags = [];

  addScore(breakdown, reasons, "location", lead.kota || lead.city || lead.area, 10, "Lokasi/area tersedia");
  addScore(breakdown, reasons, "contactability", lead.phone || lead.wa_number || lead.email, 18, "Kontak langsung tersedia");
  addScore(breakdown, reasons, "social_presence", lead.instagram || lead.ig_handle || lead.website || lead.google_maps_url, 10, "Ada jejak digital");
  addScore(
    breakdown,
    reasons,
    "espresso_fit",
    String(lead.has_espresso).toLowerCase() === "yes" || /espresso|barista|milk based|coffee shop/.test(text),
    18,
    "Terindikasi butuh beans untuk espresso/cafe service"
  );
  addScore(
    breakdown,
    reasons,
    "coffee_relevance",
    /specialty|espresso|coffee|kopi|barista|roastery|manual brew|filter/.test(text),
    14,
    "Relevan dengan kategori kopi/cafe"
  );
  addScore(
    breakdown,
    reasons,
    "opening_signal",
    /opening|baru|grand opening|soft opening|hiring|lowongan/.test(text),
    14,
    "Ada sinyal opening/hiring/aktivitas baru"
  );
  addScore(breakdown, reasons, "stock_fit", hasProductFit(text, stock), 12, "Cocok dengan produk ready stock");

  if (/hotel|restaurant|franchise|chain|group|ramai|high traffic/.test(text)) {
    breakdown.volume_potential = 10;
    reasons.push("Potensi volume lebih tinggi");
  }

  if (lead.no_contact || /tidak tertarik|do not contact|unsubscribe|stop/.test(text)) {
    breakdown.no_contact_penalty = -80;
    riskFlags.push("no_contact_or_opt_out");
  }
  if (!lead.phone && !lead.wa_number && !lead.instagram && !lead.email) {
    breakdown.no_contact_channel = -15;
    riskFlags.push("missing_contact_channel");
  }
  if (/supplier tetap|kontrak supplier|exclusive/.test(text)) {
    breakdown.existing_supplier_penalty = -15;
    riskFlags.push("possible_existing_supplier_lock");
  }

  const score = Object.values(breakdown).reduce((sum, value) => sum + toNumber(value), 20);
  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown,
    reasons,
    risk_flags: riskFlags
  };
}

function addScore(breakdown, reasons, key, condition, points, reason) {
  if (!condition) {
    breakdown[key] = 0;
    return;
  }
  breakdown[key] = points;
  reasons.push(reason);
}

function hasProductFit(text, stock) {
  if (!stock.some((item) => toNumber(item.quantity_kg) > 0)) return false;
  if (/espresso|milk based|coffee shop|barista|cafe/.test(text)) {
    return stock.some((item) => /classic|blend/i.test(`${item.nama_produk} ${item.jenis}`) && toNumber(item.quantity_kg) > 0);
  }
  if (/robusta|ekonomis|murah|price/.test(text)) {
    return stock.some((item) => /robusta/i.test(`${item.nama_produk} ${item.jenis}`) && toNumber(item.quantity_kg) > 0);
  }
  if (/manual brew|filter|specialty|gayo|kintamani|bali|aceh/.test(text)) {
    return stock.some((item) => /single|origin|gayo|kintamani|bali|aceh/i.test(`${item.nama_produk} ${item.jenis} ${item.origin_or_blend}`) && toNumber(item.quantity_kg) > 0);
  }
  return true;
}

function segmentFromScore(score) {
  if (score >= 80) return "hot";
  if (score >= 60) return "warm";
  if (score >= 40) return "nurture";
  return "cold";
}

function normalizeStatus(status, score) {
  if (status && status !== "new") return status;
  return segmentFromScore(score);
}

function actionFromScore(score, scorecard) {
  if (scorecard.risk_flags.includes("no_contact_or_opt_out")) return "Stop outreach dan masukkan no-contact list";
  if (scorecard.risk_flags.includes("missing_contact_channel")) return "Lengkapi kontak sebelum outreach";
  if (score >= 80) return "Kirim penawaran personal dan tawarkan sample 300g";
  if (score >= 60) return "Masukkan campaign edukasi dan follow-up H+3";
  if (score >= 40) return "Nurture dengan konten cost per cup dan consistency";
  return "Simpan data, jangan outreach agresif";
}
