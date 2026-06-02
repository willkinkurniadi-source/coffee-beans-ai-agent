import { toNumber } from "../lib/csv.js";

export function generateOffers(stock, leads) {
  const sortedStock = [...stock].sort((a, b) => priorityWeight(b) - priorityWeight(a));

  const hotLeads = leads.filter((lead) => toNumber(lead.lead_score) >= 60);
  const offers = [];

  for (const lead of hotLeads) {
    const match = chooseProductForLead(lead, sortedStock);
    const product = match.product;
    if (!product) continue;
    const quantity = recommendedQuantity(lead);
    const availability = availabilityFor(product, quantity);
    offers.push({
      lead_id: lead.lead_id,
      nama_cafe: lead.nama_cafe,
      kota: lead.kota,
      sku: product.sku,
      product_name: product.nama_produk,
      quantity_recommendation_kg: quantity,
      recommended_pack: recommendedPack(product, quantity),
      availability,
      offer_type: offerType(lead, availability),
      offer_angle: offerAngle(lead, product),
      match_reason: match.reason,
      price_reference: priceReference(product),
      message: buildMessage(lead, product, availability),
      approval_required: true
    });
  }

  return offers;
}

function priorityWeight(item) {
  let weight = toNumber(item.quantity_kg);
  if (item.priority_to_sell === "high") weight += 50;
  if (item.priority_to_sell === "medium") weight += 20;
  return weight;
}

function chooseProductForLead(lead, products) {
  const text = Object.values(lead).join(" ").toLowerCase();
  const sellable = products.filter((item) => toNumber(item.quantity_kg) > 0);
  if (/kintamani|bali/.test(text)) {
    return matchProduct(sellable, /kintamani|bali/i, "Bali/Kintamani signal cocok untuk Kintamani");
  }
  if (/manual brew|filter/.test(text)) {
    return matchProduct(sellable, /single|origin|gayo|kintamani/i, "Manual brew/filter cocok untuk single origin");
  }
  if (/gayo|aceh/.test(text)) {
    return matchProduct(sellable, /gayo|aceh/i, "Aceh/Gayo signal cocok untuk Gayo");
  }
  if (/espresso|barista|coffee shop|cafe/.test(text)) {
    return matchProduct(sellable, /classic|blend/i, "Cafe espresso/milk-based cocok untuk Classic Blend");
  }
  if (/specialty|filter|manual brew/.test(text)) {
    return matchProduct(sellable, /single|origin|filter/i, "Specialty cafe cocok untuk single origin");
  }
  return {
    product: sellable[0] || products[0],
    reason: "Default ke produk prioritas ready stock"
  };
}

function matchProduct(products, pattern, reason) {
  const product = products.find((item) => pattern.test(`${item.nama_produk} ${item.origin_or_blend} ${item.jenis}`));
  return {
    product: product || products[0],
    reason: product ? reason : "Produk ideal tidak ready; fallback ke produk ready stock prioritas"
  };
}

function recommendedQuantity(lead) {
  const text = Object.values(lead).join(" ").toLowerCase();
  if (/hotel|restaurant|franchise|ramai|high traffic/.test(text)) return 5;
  if (/new|opening|baru/.test(text)) return 1;
  return 2;
}

function availabilityFor(product, quantityKg) {
  const readyKg = toNumber(product.quantity_kg);
  if (readyKg >= quantityKg) {
    return {
      status: "ready_stock",
      ready_kg: readyKg,
      note: `Ready stock ${readyKg}kg`
    };
  }
  if (readyKg > 0) {
    return {
      status: "partial_ready_po",
      ready_kg: readyKg,
      note: `Ready ${readyKg}kg, sisanya PO roast`
    };
  }
  return {
    status: "po_required",
    ready_kg: 0,
    note: "Stock ready belum ada, tawarkan PO roast"
  };
}

function offerType(lead, availability) {
  const text = Object.values(lead).join(" ").toLowerCase();
  if (availability.status === "po_required") return "PO roast";
  if (/hotel|restaurant|franchise|chain|group|high traffic/.test(text)) return "Ready stock + recurring supply proposal";
  if (/opening|baru|grand opening|soft opening/.test(text)) return "Sample 300g + trial 1kg";
  return "Ready stock + sample 300g";
}

function recommendedPack(product, quantityKg) {
  if (quantityKg >= 5) return "5kg";
  if (/arabica|single|origin/i.test(`${product.nama_produk} ${product.jenis}`)) return "200g sample + 1kg trial";
  return "300g sample + 1kg trial";
}

function offerAngle(lead, product) {
  const productText = `${product.nama_produk} ${product.jenis} ${product.origin_or_blend}`.toLowerCase();
  if (/single|origin|filter/.test(productText)) {
    return `Single origin/story product untuk menu signature cafe, fokus ${product.flavor_notes || "flavor clarity"}.`;
  }
  return `Stabilitas supply espresso blend untuk cafe, konsisten untuk milk-based dan black coffee.`;
}

function priceReference(product) {
  return {
    cafe_per_kg: toNumber(product.harga_cafe_per_kg || product.price_cafe),
    retail_per_kg: toNumber(product.harga_retail_per_kg || product.price_retail),
    minimum_order_kg: toNumber(product.minimum_order_kg, 1)
  };
}

function buildMessage(lead, product, availability) {
  const cafeName = lead.nama_cafe || "kak";
  const flavor = product.flavor_notes ? ` Notes-nya ${product.flavor_notes}.` : "";
  const stockPhrase =
    availability.status === "ready_stock"
      ? "ready stock"
      : availability.status === "partial_ready_po"
        ? "sebagian ready dan bisa PO roast"
        : "bisa PO roast";
  return `Halo ${cafeName}, saya dari tim WILLKIN Coffee Roastery. Kami punya ${product.nama_produk} ${stockPhrase} untuk kebutuhan cafe.${flavor} Kalau berkenan, saya bisa kirim price list dan opsi sample 300g untuk cupping/kalibrasi barista.`;
}
