import { test, equal, assert, sql, ForbiddenError } from "@elements/app";
import { makeUser, signInAs, expenseForm } from "#app/shared/fixtures";
import { addExpense, createReport, submitReport } from "#app/shared/services/workflow";
import { reportsAwaitingApproval } from "#app/shared/services/reports";
import { requireApprover } from "#app/shared/services/auth";

test("queue", () => {
  test("lists submitted reports oldest first, and never drafts", () => {
    let ada = makeUser("Ada Park");
    signInAs(ada);

    let older = createReport("Older", [addExpense(expenseForm())[0].id]);
    let newer = createReport("Newer", [addExpense(expenseForm())[0].id]);
    createReport("Still a draft", [addExpense(expenseForm())[0].id]);
    submitReport(newer);
    submitReport(older);
    sql(`update reports set submittedAt = now() - interval '2 days' where id = ${older}`);

    equal(reportsAwaitingApproval().map((r) => r.title), ["Older", "Newer"]);
  });

  test("is for approvers only", async () => {
    signInAs(makeUser("Ada Park"));

    let refused = false;

    try {
      await (async () => requireApprover())();
    } catch (err) {
      refused = err instanceof ForbiddenError;
    }

    assert(refused, "an employee is refused");

    signInAs(makeUser("Maya Chen", "approver"));
    equal(requireApprover().role, "approver");
  });
});
