import { toNumber } from "../lib/csv.js";

export function text(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

export function number(value, fallback = 0) {
  return toNumber(value, fallback);
}

export function bool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const normalized = text(value).toLowerCase();
  if (["yes", "true", "1", "y"].includes(normalized)) return true;
  if (["no", "false", "0", "n"].includes(normalized)) return false;
  return fallback;
}

export function date(value, fallback = "") {
  const normalized = text(value);
  if (!normalized) return fallback;
  return normalized.slice(0, 10);
}

export function enumValue(value, allowed, fallback) {
  const normalized = text(value, fallback).toLowerCase().replace(/[\s-]+/g, "_");
  return allowed.includes(normalized) ? normalized : fallback;
}

export function money(value, fallback = 0) {
  return Math.round(number(value, fallback));
}

export function compactObject(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}
