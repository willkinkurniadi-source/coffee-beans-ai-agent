import { toNumber } from "../lib/csv.js";

export function createInvoiceDraft(order = {}, customer = {}) {
  const quantity = toNumber(order.quantity_kg);
  const unitPrice = toNumber(order.unit_price);
  const discount = toNumber(order.discount);
  const shipping = toNumber(order.shipping_fee);
  const tax = toNumber(order.tax);
  const subtotal = quantity * unitPrice;
  const total = subtotal - discount + shipping + tax;

  return {
    invoice_no: order.invoice_no || `INV-${Date.now()}`,
    status: "draft_needs_approval",
    company_name: process.env.INVOICE_COMPANY_NAME || "Nama Perusahaan Kamu",
    customer_name: customer.customer_name || order.customer_name || "Customer",
    sku: order.sku,
    product_name: order.nama_produk,
    quantity_kg: quantity,
    unit_price: unitPrice,
    subtotal,
    discount,
    shipping_fee: shipping,
    tax,
    total,
    payment_due_date: order.payment_due_date || nextDate(3),
    payment_instruction: process.env.INVOICE_BANK_ACCOUNT || "Isi rekening di .env",
    approval_required: true
  };
}

function nextDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

