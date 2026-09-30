import { Job, email, sql } from "@elements/app";
import ReportDecidedEmail from "#app/emails/report-decided";
import { findReport } from "#app/shared/services/reports";

export interface NotifyEmployeeJobFields {
  reportId: string;
}

/** Emails the employee that their report was approved or sent back. */
export class NotifyEmployeeJob extends Job<NotifyEmployeeJobFields> {
  static maxAttempts = 5;

  run() {
    let report = findReport(this.fields.reportId);

    if (!report || (report.status !== "approved" && report.status !== "returned")) {
      return;
    }

    let owner = sql<{ email: string }>(`select email from users where id = ${report.userId}`).firstOrThrow("report owner missing");
    let verb = report.status === "approved" ? "approved" : "sent back";

    email({
      to: owner.email,
      subject: `"${report.title}" was ${verb}`,
      body: new ReportDecidedEmail({ report }),
    });
  }
}
