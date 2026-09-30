import { Channel, sql } from "@elements/app";
import { Category, ReportStatus } from "#app/shared/format";

export interface ReportSummary {
  id: string;
  userId: string;
  ownerName: string;
  title: string;
  status: ReportStatus;
  createdAt: Date;
  submittedAt: Date | null;
  decidedAt: Date | null;
  deciderName: string | null;
  totalCents: number;
  expenseCount: number;
  /** The approver's comment on the current decision; empty while pending. */
  decisionComment: string;
}

export interface Expense {
  id: string;
  reportId: string | null;
  spentOn: string;
  merchant: string;
  amountCents: number;
  category: Category;
  note: string;
  /** Empty when the receipt is gone. */
  receiptUrl: string;
}

export interface ReportEvent {
  id: string;
  kind: "submitted" | "approved" | "returned";
  comment: string;
  userName: string;
  createdAt: Date;
}

export interface ReportDetail {
  report: ReportSummary;
  expenses: Expense[];
  events: ReportEvent[];
}

/**
 * Every status change goes out on this channel as the report's new summary,
 * so an open page updates the row in place with no refetch.
 */
export const reportUpdates = new Channel<ReportSummary>("reportUpdates");

const SUMMARY = sql.raw(`
  select r.id,
         r.userId,
         owner.name as ownerName,
         r.title,
         r.status,
         r.createdAt,
         r.submittedAt,
         r.decidedAt,
         decider.name as deciderName,
         coalesce(totals.totalCents, 0)::int as totalCents,
         coalesce(totals.expenseCount, 0)::int as expenseCount,
         case when r.status in ('approved', 'returned') then coalesce(decision.comment, '') else '' end as decisionComment
    from reports r
    join users owner on owner.id = r.userId
    left join users decider on decider.id = r.decidedBy
    left join lateral (
      select sum(e.amountCents) as totalCents, count(*) as expenseCount
        from expenses e
       where e.reportId = r.id
    ) totals on true
    left join lateral (
      select ev.comment
        from reportEvents ev
       where ev.reportId = r.id and ev.kind <> 'submitted'
       order by ev.createdAt desc, ev.id desc
       limit 1
    ) decision on true
`);

const EXPENSE = sql.raw(`
  select e.id,
         e.reportId,
         to_char(e.spentOn, 'YYYY-MM-DD') as spentOn,
         e.merchant,
         e.amountCents,
         e.category,
         e.note,
         case when rc.id is null then '' else '/receipts/' || rc.id || '/' || rc.hash end as receiptUrl
    from expenses e
    left join receipts rc on rc.id = e.receiptId
`);

export function findReport(id: string): ReportSummary | undefined {
  return sql<ReportSummary>(`${SUMMARY} where r.id = ${id}`).first();
}

export function reportsFor(userId: string): ReportSummary[] {
  return sql<ReportSummary>(`${SUMMARY} where r.userId = ${userId} order by r.createdAt desc, r.id desc`).all();
}

export function reportsAwaitingApproval(): ReportSummary[] {
  return sql<ReportSummary>(`${SUMMARY} where r.status = 'submitted' order by r.submittedAt asc`).all();
}

export function reportsRecentlyDecided(limit: number): ReportSummary[] {
  return sql<ReportSummary>(`
    ${SUMMARY}
    where r.status in ('approved', 'returned')
    order by r.decidedAt desc
    limit ${limit}
  `).all();
}

export function unfiledExpenses(userId: string): Expense[] {
  return sql<Expense>(`
    ${EXPENSE}
    where e.userId = ${userId} and e.reportId is null
    order by e.spentOn desc, e.id desc
  `).all();
}

export function reportExpenses(reportId: string): Expense[] {
  return sql<Expense>(`${EXPENSE} where e.reportId = ${reportId} order by e.spentOn, e.id`).all();
}

export function reportEvents(reportId: string): ReportEvent[] {
  return sql<ReportEvent>(`
    select ev.id, ev.kind, ev.comment, u.name as userName, ev.createdAt
      from reportEvents ev
      join users u on u.id = ev.userId
     where ev.reportId = ${reportId}
     order by ev.createdAt, ev.id
  `).all();
}

export function broadcastReport(id: string) {
  let report = findReport(id);

  if (report) {
    reportUpdates.notify(report);
  }
}
