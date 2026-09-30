import { test, equal, assert, errorf, sql, session, ValidationError, ForbiddenError, AuthError } from "@elements/app";
import { makeUser, signInAs, expenseForm, receiptFile } from "#app/shared/fixtures";
import {
  addExpense,
  deleteExpense,
  createReport,
  submitReport,
  decideReport,
  detachExpense,
  fetchReportDetail,
} from "#app/shared/services/workflow";
import { reportsAwaitingApproval } from "#app/shared/services/reports";

async function throwsA(kind: Function, fn: () => Promise<unknown> | unknown): Promise<boolean> {
  try {
    await fn();
  } catch (err) {
    return err instanceof kind;
  }

  return false;
}

function jobCount(path: string): number {
  return sql<{ n: number }>(`select count(*)::int as n from elements.jobs where path like ${"%" + path + "%"}`).firstOrThrow().n;
}

test("workflow", () => {
  test("adding an expense needs a signed-in user", async () => {
    assert(await throwsA(AuthError, () => addExpense(expenseForm())));
  });

  test("an employee adds an expense with its receipt", () => {
    let ada = makeUser("Ada Park");
    signInAs(ada);

    let unfiled = addExpense(expenseForm({ amount: "$23.75", merchant: "  Tartine  " }));

    equal(unfiled.length, 1);
    equal(unfiled[0].amountCents, 2375);
    equal(unfiled[0].merchant, "Tartine");
    assert(unfiled[0].receiptUrl.startsWith("/receipts/"), "receipt url is served");
  });

  test("a bad expense reports every field at once", () => {
    signInAs(makeUser("Ada Park"));

    try {
      addExpense(expenseForm({ amount: "lots", merchant: "", receipt: null }));
      errorf("expected a ValidationError");
    } catch (err: any) {
      assert(err instanceof ValidationError);
      equal(Object.keys(err.errors as object).sort(), ["amount", "merchant", "receipt"]);
    }
  });

  test("a receipt must be an image", async () => {
    signInAs(makeUser("Ada Park"));

    assert(await throwsA(ValidationError, () => addExpense(expenseForm({ receipt: receiptFile("text/html") }))));
    assert(await throwsA(ValidationError, () => addExpense(expenseForm({ receipt: receiptFile("image/svg+xml") }))));
  });

  test("only unfiled expenses of your own can be deleted", () => {
    let ada = makeUser("Ada Park");
    let ben = makeUser("Ben Ito");
    signInAs(ada);
    let [expense] = addExpense(expenseForm());

    signInAs(ben);
    deleteExpense(expense.id);
    equal(sql(`select 1 from expenses where id = ${expense.id}`).all().length, 1);

    signInAs(ada);
    equal(deleteExpense(expense.id).length, 0);
  });

  test("group, submit, approve", () => {
    let ada = makeUser("Ada Park");
    let maya = makeUser("Maya Chen", "approver");
    signInAs(ada);
    let unfiled = addExpense(expenseForm());
    unfiled = addExpense(expenseForm({ merchant: "City Cab", amount: "18", category: "travel" }));

    let id = createReport("Client visit", unfiled.map((e) => e.id));
    let draft = fetchReportDetail(id);
    equal(draft.report.status, "draft");
    equal(draft.report.totalCents, 3040);
    equal(draft.expenses.length, 2);

    let submitted = submitReport(id);
    equal(submitted.report.status, "submitted");
    equal(submitted.events.map((e) => e.kind), ["submitted"]);
    equal(jobCount("notify-approvers"), 1);
    assert(reportsAwaitingApproval().some((r) => r.id === id), "report is in the queue");

    signInAs(maya, "approver");
    let approved = decideReport(id, "approved", "Thanks");
    equal(approved.report.status, "approved");
    equal(approved.report.deciderName, "Maya Chen");
    equal(approved.report.decisionComment, "Thanks");
    equal(jobCount("notify-employee"), 1);
    assert(!reportsAwaitingApproval().some((r) => r.id === id), "report left the queue");
  });

  test("sending back needs a comment, and the employee can resubmit", async () => {
    let ada = makeUser("Ada Park");
    let maya = makeUser("Maya Chen", "approver");
    signInAs(ada);
    let id = createReport("Supplies", addExpense(expenseForm()).map((e) => e.id));
    submitReport(id);

    signInAs(maya, "approver");
    assert(await throwsA(ValidationError, () => decideReport(id, "returned", "  ")));
    equal(decideReport(id, "returned", "Wrong category").report.status, "returned");

    signInAs(ada);
    let detail = fetchReportDetail(id);
    equal(detail.report.decisionComment, "Wrong category");
    equal(submitReport(id).report.status, "submitted");
    equal(fetchReportDetail(id).report.decisionComment, "", "an old comment does not follow a resubmit");
  });

  test("who may decide", async () => {
    let ada = makeUser("Ada Park");
    let ben = makeUser("Ben Ito");
    let maya = makeUser("Maya Chen", "approver");
    let omar = makeUser("Omar Haddad", "approver");

    signInAs(maya, "approver");
    let own = createReport("Maya's trip", addExpense(expenseForm()).map((e) => e.id));
    submitReport(own);
    assert(await throwsA(ForbiddenError, () => decideReport(own, "approved", "")), "an approver cannot approve their own");

    signInAs(omar, "approver");
    equal(decideReport(own, "approved", "").report.status, "approved");
    assert(await throwsA(ForbiddenError, () => decideReport(own, "returned", "late")), "a decided report stays decided");

    signInAs(ada);
    let adas = createReport("Ada's lunch", addExpense(expenseForm()).map((e) => e.id));
    submitReport(adas);

    signInAs(ben);
    assert(await throwsA(ForbiddenError, () => decideReport(adas, "approved", "")), "an employee cannot approve");
    assert(await throwsA(Error, () => fetchReportDetail(adas)), "an employee cannot read another's report");
  });

  test("a submitted report is locked for its owner", async () => {
    let ada = makeUser("Ada Park");
    signInAs(ada);
    let unfiled = addExpense(expenseForm());
    let id = createReport("Locked", unfiled.map((e) => e.id));
    submitReport(id);

    assert(await throwsA(ForbiddenError, () => detachExpense(id, unfiled[0].id)));
    assert(await throwsA(ForbiddenError, () => submitReport(id)));
  });

  test("an empty report cannot be submitted", async () => {
    let ada = makeUser("Ada Park");
    signInAs(ada);
    let [expense] = addExpense(expenseForm());
    let id = createReport("Empty soon", [expense.id]);
    detachExpense(id, expense.id);

    assert(await throwsA(ValidationError, () => submitReport(id)));
  });
});
