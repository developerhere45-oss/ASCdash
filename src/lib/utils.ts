import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 1,
    notation: value > 9999 ? "compact" : "standard",
  }).format(value);
}

export function statusTone(status: string) {
  const clean = status.toLowerCase();
  if (clean.includes("complete") || clean.includes("approved") || clean.includes("active")) return "success";
  if (clean.includes("cancel") || clean.includes("reject") || clean.includes("suspend") || clean.includes("dispute")) return "danger";
  if (clean.includes("way") || clean.includes("assign") || clean.includes("confirm")) return "info";
  return "warning";
}
