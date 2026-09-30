import type { CurrentUser } from "#app/shared/services/auth";
import type { ReportSummary } from "#app/shared/services/reports";

/** The owner sees their own reports; an approver sees everyone's. */
export function canView(user: CurrentUser, report: ReportSummary): boolean {
  return report.userId === user.id || user.role === "approver";
}

/** An approver decides on submitted reports, never on their own. */
export function canDecide(user: CurrentUser, report: ReportSummary): boolean {
  return user.role === "approver" && report.userId !== user.id && report.status === "submitted";
}

export function canEdit(user: CurrentUser, report: ReportSummary): boolean {
  return report.userId === user.id && (report.status === "draft" || report.status === "returned");
}
