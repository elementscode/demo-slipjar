import { Request, Response } from "@elements/app";
import { requireApprover } from "#app/shared/services/auth";
import { reportUpdates } from "#app/shared/services/reports";
import html, { loadTotals } from "./template";

export default function route(req: Request, res: Response) {
  let user = requireApprover();
  let now = new Date();
  let currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let asked = typeof req.query.month === "string" ? req.query.month : "";
  let month = /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) ? asked : currentMonth;

  // Any status change can move a total, so the page refetches on each one.
  let updates = reportUpdates.listen();

  return new html({ user, initial: loadTotals(month), currentMonth, updates });
}
