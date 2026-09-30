import { test, equal, assert, Email } from "@elements/app";
import { makeUser, signInAs, expenseForm } from "#app/shared/fixtures";
import { addExpense, createReport, submitReport, decideReport, fetchReportDetail } from "#app/shared/services/workflow";
import { canView, canEdit, canDecide } from "#app/shared/permissions";
import { findReport } from "#app/shared/services/reports";
import ReportDecidedEmail from "#app/emails/report-decided";
import ReportSubmittedEmail from "#app/emails/report-submitted";

test("report", () => {
  test("permissions follow owner, role and status", () => {
    let ada = { id: "a", name: "Ada", email: "a@x", role: "employee" as const };
    let ben = { id: "b", name: "Ben", email: "b@x", role: "employee" as const };
    let maya = { id: "m", name: "Maya", email: "m@x", role: "approver" as const };
    let report = findReportStub("a", "submitted");

    assert(canView(ada, report) && canView(maya, report) && !canView(ben, report));
    assert(canDecide(maya, report) && !canDecide(ada, report));
    assert(!canEdit(ada, report), "submitted is locked");
    assert(canEdit(ada, findReportStub("a", "returned")), "returned is editable again");
    assert(!canDecide({ ...maya, id: "a" }, report), "not on your own");
  });

  test("history records each step with its comment", () => {
    let ada = makeUser("Ada Park");
    let maya = makeUser("Maya Chen", "approver");
    signInAs(ada);
    let id = createReport("Trip", [addExpense(expenseForm())[0].id]);
    submitReport(id);
    signInAs(maya, "approver");
    decideReport(id, "returned", "Missing the hotel folio");
    signInAs(ada);
    submitReport(id);

    let events = fetchReportDetail(id).events;
    equal(events.map((e) => e.kind), ["submitted", "returned", "submitted"]);
    equal(events[1].comment, "Missing the hotel folio");
    equal(events[1].userName, "Maya Chen");
  });

  test("the emails say what happened", () => {
    let ada = makeUser("Ada Park");
    let maya = makeUser("Maya Chen", "approver");
    signInAs(ada);
    let id = createReport("Trip", [addExpense(expenseForm({ amount: "184.50" }))[0].id]);
    submitReport(id);

    let submitted = new Email({ to: maya.email, subject: "s", body: new ReportSubmittedEmail({ report: findReport(id)! }) });
    assert(submitted.text.includes("Ada Park submitted a report"), submitted.text);
    assert(submitted.text.includes("$184.50"));
    assert(submitted.html.includes(`/reports/${id}`));

    signInAs(maya, "approver");
    decideReport(id, "returned", "Split the headphones out");

    let decided = new Email({ to: ada.email, subject: "d", body: new ReportDecidedEmail({ report: findReport(id)! }) });
    assert(decided.text.includes("sent back"), decided.text);
    assert(decided.text.includes("Split the headphones out"));
  });
});

function findReportStub(userId: string, status: "draft" | "submitted" | "approved" | "returned") {
  return {
    id: "r",
    userId,
    ownerName: "",
    title: "",
    status,
    createdAt: new Date(),
    submittedAt: null,
    decidedAt: null,
    deciderName: null,
    totalCents: 0,
    expenseCount: 0,
    decisionComment: "",
  };
}
