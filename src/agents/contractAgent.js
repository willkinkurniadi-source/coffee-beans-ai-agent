import { toNumber } from "../lib/csv.js";

export function createContractRecommendations(pipeline) {
  return pipeline
    .filter((item) => item.priority === "P1")
    .slice(0, 5)
    .map((item) => ({
      lead_id: item.lead_id,
      nama_cafe: item.nama_cafe,
      contract_type: toNumber(item.lead_score) >= 90 ? "Monthly supply agreement" : "Trial supply agreement",
      recommended_terms: [
        "Trial sample 300g",
        "Trial order 1-2kg",
        "Recurring supply 10-20kg/bulan setelah cupping disetujui",
        "Payment: DP/paid before delivery untuk 3 order pertama",
        "SLA roasting/packing: H+1 sampai H+3 setelah payment"
      ],
      next_action: "Setelah reply positif, kirim proposal cafe partner dan jadwalkan cupping."
    }));
}

