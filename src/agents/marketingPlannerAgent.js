import { toNumber } from "../lib/csv.js";

export function createMarketingPlan({ stock = [], leads = [], orders = [], contentCalendar = [] }) {
  const priorityProducts = stock
    .filter((item) => toNumber(item.quantity_kg) > 0 && isCoffeeBeanProduct(item))
    .sort((a, b) => productPriority(b) - productPriority(a));
  const product = priorityProducts.find((item) => /classic blend/i.test(item.nama_produk || "")) || priorityProducts[0] || {};
  const cafeLeads = leads.filter((lead) => toNumber(lead.lead_score) >= 60);
  const revenueToday = orders.reduce((sum, order) => sum + toNumber(order.total), 0);

  return {
    objective: "Bangun demand B2B cafe sambil mulai marketplace traction Day 1.",
    target_today: {
      revenue_target: 2500000,
      sample_requests: 10,
      cafe_outreach: 75,
      content_to_publish: 3
    },
    focus_product: product.nama_produk || "Classic Blend",
    stock_logic: product.quantity_kg
      ? `${product.nama_produk} ready ${product.quantity_kg}kg, aman untuk didorong hari ini.`
      : "Stock belum terbaca, isi stock opname sebelum campaign.",
    channel_plan: [
      {
        channel: "WhatsApp B2B Cafe",
        action: `Kirim outreach personal ke ${Math.min(cafeLeads.length || 75, 75)} cafe dengan offer sample 300g.`,
        cta: "Balas SAMPLE untuk price list dan sample 300g."
      },
      {
        channel: "Instagram",
        action: "Publish edukasi cost per cup dan konsistensi espresso.",
        cta: "DM SAMPLE untuk sample cafe."
      },
      {
        channel: "TikTok",
        action: "Short video behind-the-scenes roasting + value proposition untuk cafe.",
        cta: "Komentar CAFE untuk katalog harga."
      },
      {
        channel: "Tokopedia",
        action: "Naikkan TopAds untuk House Robusta 1kg dan Classic Blend 1kg.",
        cta: "Beli 1kg / chat untuk kebutuhan cafe."
      }
    ],
    upload_checklist: createUploadChecklist(contentCalendar),
    revenue_snapshot: {
      today_recorded_revenue: revenueToday,
      gap_to_target: Math.max(0, 2500000 - revenueToday)
    }
  };
}

function productPriority(item) {
  let score = toNumber(item.quantity_kg);
  if (item.priority_to_sell === "high") score += 100;
  if (/classic|blend/i.test(item.nama_produk)) score += 25;
  if (/robusta/i.test(item.nama_produk)) score += 20;
  return score;
}

function isCoffeeBeanProduct(item) {
  const text = `${item.nama_produk || ""} ${item.product_name || ""} ${item.jenis || ""} ${item.category || ""}`;
  return /coffee|kopi|beans|bean|robusta|arabica|blend|espresso|gayo|kintamani|preanger/i.test(text) && !/packaging|pouch|bag|sticker|label/i.test(text);
}

function createUploadChecklist(contentCalendar) {
  const today = new Date().toISOString().slice(0, 10);
  const items = contentCalendar.filter((item) => !item.date || item.date <= today || item.status !== "published");
  if (items.length === 0) {
    return [
      { task: "Generate 1 feed IG", status: "todo" },
      { task: "Generate 1 TikTok short video", status: "todo" },
      { task: "Generate 1 WhatsApp broadcast", status: "todo" }
    ];
  }
  return items.map((item) => ({
    task: `${item.channel} - ${item.content_type} - ${item.product_focus}`,
    status: item.status || "draft",
    owner: item.owner || "marketing"
  }));
}
