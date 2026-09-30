import { Job, email, sql } from "@elements/app";
import ReportSubmittedEmail from "#app/emails/report-submitted";
import { findReport } from "#app/shared/services/reports";

export interface NotifyApproversJobFields {
  reportId: string;
}

/**
 * Emails every approver, other than the one who submitted, that a report is
 * waiting for them.
 */
export class NotifyApproversJob extends Job<NotifyApproversJobFields> {
  static maxAttempts = 5;

  run() {
    let report = findReport(this.fields.reportId);

    if (!report || report.status !== "submitted") {
      return;
    }

    let approvers = sql<{ email: string }>(`
      select email from users where role = 'approver' and id <> ${report.userId} order by email
    `).all();

    if (approvers.length === 0) {
      return;
    }

    email({
      to: approvers.map((a) => a.email),
      subject: `${report.ownerName} submitted "${report.title}"`,
      body: new ReportSubmittedEmail({ report }),
    });
  }
}
