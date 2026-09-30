import { Request, Response } from "@elements/app";
import { requireUser } from "#app/shared/services/auth";
import { reportUpdates, reportsFor, unfiledExpenses } from "#app/shared/services/reports";
import html from "./template";

export default function route(req: Request, res: Response) {
  let user = requireUser();

  // Listen before reading, so a change that lands in between still arrives.
  let updates = reportUpdates.listen({ filter: (r) => r.userId === user.id });

  let initial = {
    reports: reportsFor(user.id),
    unfiled: unfiledExpenses(user.id),
    flashId: "",
  };

  return new html({ user, today: localDay(), initial, updates });
}

function localDay(): string {
  let now = new Date();
  let month = String(now.getMonth() + 1).padStart(2, "0");
  let day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}
