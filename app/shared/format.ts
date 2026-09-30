export type Category = "travel" | "meals" | "software" | "supplies" | "other";
export type ReportStatus = "draft" | "submitted" | "approved" | "returned";
export type Role = "employee" | "approver";

export const CATEGORIES: Category[] = ["travel", "meals", "software", "supplies", "other"];

export const CATEGORY_LABELS: Record<Category, string> = {
  travel: "Travel",
  meals: "Meals",
  software: "Software",
  supplies: "Supplies",
  other: "Other",
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  draft: "Draft",
  submitted: "Awaiting approval",
  approved: "Approved",
  returned: "Sent back",
};

const STATUS_PILLS: Record<ReportStatus, string> = {
  draft: "",
  submitted: "is-info",
  approved: "is-success",
  returned: "is-warning",
};

export function statusPill(status: ReportStatus): string {
  return ["pill", STATUS_PILLS[status]].filter(Boolean).join(" ");
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatMoney(cents: number): string {
  return money.format(cents / 100);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats a `YYYY-MM-DD` day. Days are strings end to end, so no timezone moves them. */
export function formatDay(day: string): string {
  let [y, m, d] = day.split("-").map(Number);

  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function formatWhen(at: Date | null): string {
  if (!at) {
    return "";
  }

  return `${MONTHS[at.getMonth()]} ${at.getDate()}, ${at.getFullYear()}`;
}

export function formatStamp(at: Date): string {
  let hours = at.getHours();
  let minutes = String(at.getMinutes()).padStart(2, "0");

  return `${MONTHS[at.getMonth()]} ${at.getDate()}, ${hours % 12 || 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}

/**
 * Parses what someone types into an amount field ("$1,204.5", "18") into
 * cents, or returns null when it is not an amount.
 */
export function parseAmount(text: string): number | null {
  let cleaned = text.trim().replace(/[$,\s]/g, "");

  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) {
    return null;
  }

  let cents = Math.round(Number(cleaned) * 100);

  return cents > 0 ? cents : null;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
