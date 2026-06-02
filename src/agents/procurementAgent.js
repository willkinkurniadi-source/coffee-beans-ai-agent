import { toNumber } from "../lib/csv.js";

export function createProcurementPlan({ stock = [], packaging = [], orders = [] }) {
  const velocity = calculateVelocity(orders);
  const roastPlan = stock.map((item) => {
    const weeklyVelocity = velocity[item.sku] || estimateVelocity(item);
    const quantity = toNumber(item.quantity_kg);
    const daysCover = weeklyVelocity > 0 ? Math.round((quantity / weeklyVelocity) * 7) : 999;
    const suggestedRoastKg = daysCover <= 7 ? Math.max(10, weeklyVelocity * 2 - quantity) : 0;
    return {
      sku: item.sku,
      product_name: item.nama_produk,
      stock_kg: quantity,
      estimated_weekly_velocity_kg: weeklyVelocity,
      days_cover: daysCover,
      action: suggestedRoastKg > 0 ? `Roast ${Math.ceil(suggestedRoastKg)}kg dalam 48 jam` : "Aman, monitor harian",
      priority: suggestedRoastKg > 0 ? "high" : "normal"
    };
  });

  const packagingAlerts = packaging.map((item) => {
    const stockQty = toNumber(item.stock_qty);
    const reorderPoint = toNumber(item.reorder_point);
    return {
      item_id: item.item_id,
      item_name: `${item.item_name} ${item.variant}`,
      stock_qty: stockQty,
      reorder_point: reorderPoint,
      supplier: item.supplier,
      action: stockQty <= reorderPoint ? `Order ulang ke ${item.supplier}` : "Aman",
      priority: stockQty <= reorderPoint ? "high" : "normal"
    };
  });

  return {
    roast_plan: roastPlan,
    packaging_alerts: packagingAlerts,
    owner_summary: summarize(roastPlan, packagingAlerts)
  };
}

function calculateVelocity(orders) {
  return orders.reduce((map, order) => {
    map[order.sku] = (map[order.sku] || 0) + toNumber(order.quantity_kg);
    return map;
  }, {});
}

function estimateVelocity(item) {
  if (/classic|blend/i.test(item.nama_produk)) return 15;
  if (/robusta/i.test(item.nama_produk)) return 12;
  return 4;
}

function summarize(roastPlan, packagingAlerts) {
  const roastUrgent = roastPlan.filter((item) => item.priority === "high");
  const packagingUrgent = packagingAlerts.filter((item) => item.priority === "high");
  return [
    roastUrgent.length ? `${roastUrgent.length} SKU perlu roast planning.` : "Roast stock aman untuk hari ini.",
    packagingUrgent.length ? `${packagingUrgent.length} item packaging perlu reorder.` : "Packaging aman."
  ].join(" ");
}

