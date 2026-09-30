import { Request, Response, NotFoundError } from "@elements/app";
import { requireUser } from "#app/shared/services/auth";
import { reportUpdates, findReport, reportExpenses, reportEvents, unfiledExpenses } from "#app/shared/services/reports";
import { canView } from "#app/shared/permissions";
import html from "./template";

export default function route(req: Request, res: Response) {
  let user = requireUser();
  let id = req.params.id;

  let updates = reportUpdates.listen({ filter: (r) => r.id === id });
  let report = findReport(id);

  if (!report || !canView(user, report)) {
    throw new NotFoundError("report not found");
  }

  let expenses = reportExpenses(id);

  let initial = {
    detail: { report, expenses, events: reportEvents(id) },
    selectedId: expenses[0]?.id ?? "",
    unfiled: report.userId === user.id ? unfiledExpenses(user.id) : [],
    picks: [],
    comment: "",
    error: "",
    busy: false,
  };

  return new html({ user, initial, updates });
}
