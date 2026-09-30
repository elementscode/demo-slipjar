import { sql, tx, File, ForbiddenError, NotFoundError, ValidationError } from "@elements/app";
import { Category, CATEGORIES, parseAmount } from "#app/shared/format";
import { requireUser, requireApprover, CurrentUser } from "#app/shared/services/auth";
import {
  ReportSummary,
  ReportDetail,
  Expense,
  findReport,
  reportExpenses,
  reportEvents,
  unfiledExpenses,
  broadcastReport,
} from "#app/shared/services/reports";
import { canView, canEdit, canDecide } from "#app/shared/permissions";
import { NotifyApproversJob } from "#app/jobs/notify-approvers";
import { NotifyEmployeeJob } from "#app/jobs/notify-employee";

// Types a browser can show inline. Anything else is refused at upload, and
// the receipt route checks again before it names a content type.
export const RECEIPT_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

export interface ExpenseForm {
  spentOn: string;
  merchant: string;
  amount: string;
  category: Category;
  note: string;
  receipt: File | null;
}

export type ExpenseErrors = Partial<Record<keyof ExpenseForm, string[]>>;

function validateExpense(form: ExpenseForm): { amountCents: number } {
  let errors: ExpenseErrors = {};
  let amountCents = parseAmount(form.amount);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.spentOn)) {
    errors.spentOn = ["Pick the date on the receipt."];
  } else if (new Date(form.spentOn + "T00:00:00Z").getTime() > Date.now() + 36 * 3600 * 1000) {
    errors.spentOn = ["That date is in the future."];
  }

  if (!form.merchant.trim()) {
    errors.merchant = ["Who was paid?"];
  }

  if (amountCents === null) {
    errors.amount = ["Enter an amount like 42.50."];
  }

  if (!CATEGORIES.includes(form.category)) {
    errors.category = ["Pick a category."];
  }

  if (!form.receipt) {
    errors.receipt = ["Attach a photo of the receipt."];
  } else if (!RECEIPT_TYPES.has(form.receipt.contentType)) {
    errors.receipt = ["The receipt has to be a JPEG, PNG, WebP or GIF image."];
  } else if (form.receipt.size > MAX_RECEIPT_BYTES) {
    errors.receipt = ["That image is over 8 MB. Try a smaller photo."];
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  return { amountCents: amountCents! };
}

function ownedReportOrThrow(user: CurrentUser, reportId: string): ReportSummary {
  let report = findReport(reportId);

  if (!report || !canView(user, report)) {
    throw new NotFoundError("report not found");
  }

  if (!canEdit(user, report)) {
    throw new ForbiddenError("This report can't be changed right now.");
  }

  return report;
}

/** @rpc */
export function addExpense(form: ExpenseForm): Expense[] {
  let user = requireUser();
  let { amountCents } = validateExpense(form);
  let receipt = form.receipt!;

  tx(() => {
    let row = sql<{ id: string }>(`
      insert into receipts (userId, name, contentType, size, data)
           values (${user.id}, ${receipt.name}, ${receipt.contentType}, ${receipt.size}, ${receipt.data})
        returning id
    `).firstOrThrow("receipt insert returned no row");

    sql(`
      insert into expenses (userId, receiptId, spentOn, merchant, amountCents, category, note)
           values (${user.id}, ${row.id}, ${form.spentOn}::date, ${form.merchant.trim()}, ${amountCents}, ${form.category}::expenseCategory, ${form.note.trim()})
    `);
  });

  return unfiledExpenses(user.id);
}

/**
 * Deletes an expense that is not on a report.
 *
 * @rpc
 */
export function deleteExpense(expenseId: string): Expense[] {
  let user = requireUser();

  sql(`delete from expenses where id = ${expenseId} and userId = ${user.id} and reportId is null`);

  return unfiledExpenses(user.id);
}

/**
 * Groups unfiled expenses into a new draft report and returns its id.
 *
 * @rpc
 */
export function createReport(title: string, expenseIds: string[]): string {
  let user = requireUser();
  let name = title.trim();

  if (!name) {
    throw new ValidationError("Give the report a name.");
  }

  if (expenseIds.length === 0) {
    throw new ValidationError("Pick at least one expense.");
  }

  let id = tx(() => {
    let report = sql<{ id: string }>(`
      insert into reports (userId, title) values (${user.id}, ${name}) returning id
    `).firstOrThrow("report insert returned no row");

    let moved = sql<{ id: string }>(`
      update expenses set reportId = ${report.id}
       where id = any(${expenseIds}::uuid[]) and userId = ${user.id} and reportId is null
      returning id
    `).all();

    if (moved.length === 0) {
      throw new ValidationError("Those expenses are already on a report.");
    }

    return report.id;
  });

  broadcastReport(id);

  return id;
}

/** @rpc */
export function fetchReportDetail(reportId: string): ReportDetail {
  let user = requireUser();
  let report = findReport(reportId);

  if (!report || !canView(user, report)) {
    throw new NotFoundError("report not found");
  }

  return {
    report,
    expenses: reportExpenses(reportId),
    events: reportEvents(reportId),
  };
}

/** @rpc */
export function fetchUnfiled(): Expense[] {
  return unfiledExpenses(requireUser().id);
}

/** @rpc */
export function attachExpenses(reportId: string, expenseIds: string[]): ReportDetail {
  let user = requireUser();

  ownedReportOrThrow(user, reportId);

  sql(`
    update expenses set reportId = ${reportId}
     where id = any(${expenseIds}::uuid[]) and userId = ${user.id} and reportId is null
  `);

  broadcastReport(reportId);

  return fetchReportDetail(reportId);
}

/**
 * Takes an expense off a report; it goes back to the unfiled list.
 *
 * @rpc
 */
export function detachExpense(reportId: string, expenseId: string): ReportDetail {
  let user = requireUser();

  ownedReportOrThrow(user, reportId);

  sql(`update expenses set reportId = null where id = ${expenseId} and reportId = ${reportId}`);

  broadcastReport(reportId);

  return fetchReportDetail(reportId);
}

/**
 * Deletes a draft; its expenses go back to the unfiled list.
 *
 * @rpc
 */
export function deleteReport(reportId: string) {
  let user = requireUser();
  let report = ownedReportOrThrow(user, reportId);

  if (report.status !== "draft") {
    throw new ForbiddenError("Only a draft can be deleted.");
  }

  sql(`delete from reports where id = ${reportId}`);
}

/** @rpc */
export function submitReport(reportId: string): ReportDetail {
  let user = requireUser();
  let report = ownedReportOrThrow(user, reportId);

  if (report.expenseCount === 0) {
    throw new ValidationError("Add at least one expense before you submit.");
  }

  tx(() => {
    sql(`
      update reports
         set status = 'submitted', submittedAt = now(), decidedAt = null, decidedBy = null
       where id = ${reportId}
    `);

    sql(`insert into reportEvents (reportId, userId, kind) values (${reportId}, ${user.id}, 'submitted')`);

    new NotifyApproversJob({ reportId }).schedule();
  });

  broadcastReport(reportId);

  return fetchReportDetail(reportId);
}

/** @rpc */
export function decideReport(reportId: string, decision: "approved" | "returned", comment: string): ReportDetail {
  let user = requireApprover();
  let report = findReport(reportId);
  let note = comment.trim();

  if (!report) {
    throw new NotFoundError("report not found");
  }

  if (report.userId === user.id) {
    throw new ForbiddenError("Another approver has to decide on your own report.");
  }

  if (!canDecide(user, report)) {
    throw new ForbiddenError("This report is no longer waiting for approval.");
  }

  if (decision === "returned" && !note) {
    throw new ValidationError("Say what needs to change before sending it back.");
  }

  tx(() => {
    // The status guard makes two approvers deciding at once safe: the second
    // update matches nothing.
    let updated = sql<{ id: string }>(`
      update reports
         set status = ${decision}::reportStatus, decidedAt = now(), decidedBy = ${user.id}
       where id = ${reportId} and status = 'submitted'
      returning id
    `).first();

    if (!updated) {
      throw new ForbiddenError("This report is no longer waiting for approval.");
    }

    sql(`
      insert into reportEvents (reportId, userId, kind, comment)
           values (${reportId}, ${user.id}, ${decision}::reportEventKind, ${note})
    `);

    new NotifyEmployeeJob({ reportId }).schedule();
  });

  broadcastReport(reportId);

  return fetchReportDetail(reportId);
}
