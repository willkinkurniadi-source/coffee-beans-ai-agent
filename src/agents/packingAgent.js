import { toNumber } from "../lib/csv.js";

export function createPackingQueue(orders) {
  return orders
    .filter((order) => ["paid", "approved"].includes(String(order.status).toLowerCase()))
    .map((order) => ({
      order_id: order.order_id,
      customer_name: order.customer_name,
      sku: order.sku,
      product_name: order.nama_produk,
      quantity_kg: toNumber(order.quantity_kg),
      packing_status: order.packing_status || "pending",
      production_notes: order.production_notes || "Whole beans, standard cafe pack",
      ship_to: order.ship_to || "alamat belum diisi",
      expedition: order.expedition || "belum dipilih",
      qc_checklist: [
        "Cek SKU dan quantity",
        "Cek roast date dan batch",
        "Cek berat per pack",
        "Cek seal dan label",
        "Masukkan invoice/packing slip",
        "Update resi setelah pickup"
      ],
      blocked: !order.ship_to
    }));
}

