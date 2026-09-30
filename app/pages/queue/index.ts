import { Request, Response } from "@elements/app";
import { requireApprover } from "#app/shared/services/auth";
import { reportUpdates, reportsAwaitingApproval, reportsRecentlyDecided } from "#app/shared/services/reports";
import html from "./template";

export default function route(req: Request, res: Response) {
  let user = requireApprover();
  let updates = reportUpdates.listen();

  let initial = {
    waiting: reportsAwaitingApproval(),
    decided: reportsRecentlyDecided(8),
    newId: "",
  };

  return new html({ user, initial, updates });
}
