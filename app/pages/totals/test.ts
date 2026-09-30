import { test, equal } from "@elements/app";
import { makeUser, signInAs, expenseForm } from "#app/shared/fixtures";
import { addExpense, createReport, submitReport, decideReport } from "#app/shared/services/workflow";
import { loadTotals, shiftMonth } from "./template";

test("totals", () => {
  test("approved counts, submitted is pending, drafts and other months are out", () => {
    let ada = makeUser("Ada Park");
    let maya = makeUser("Maya Chen", "approver");
    signInAs(ada);

    let approved = createReport("Approved", [
      addExpense(expenseForm({ spentOn: "2026-08-03", amount: "100", category: "travel" }))[0].id,
      addExpense(expenseForm({ spentOn: "2026-08-04", amount: "20", category: "meals" }))[0].id,
    ]);
    let pending = createReport("Pending", [addExpense(expenseForm({ spentOn: "2026-08-10", amount: "5", category: "meals" }))[0].id]);
    createReport("Draft", [addExpense(expenseForm({ spentOn: "2026-08-11", amount: "999", category: "meals" }))[0].id]);
    let july = createReport("July", [addExpense(expenseForm({ spentOn: "2026-07-31", amount: "50", category: "travel" }))[0].id]);

    submitReport(approved);
    submitReport(pending);
    submitReport(july);
    signInAs(maya, "approver");
    decideReport(approved, "approved", "");
    decideReport(july, "approved", "");

    let totals = loadTotals("2026-08");
    let travel = totals.byCategory.find((r) => r.key === "travel")!;
    let meals = totals.byCategory.find((r) => r.key === "meals")!;

    equal(totals.byCategory.length, 5, "every category is listed");
    equal(totals.byCategory[0].key, "travel", "biggest first");
    equal([travel.approvedCents, travel.pendingCents], [10000, 0]);
    equal([meals.approvedCents, meals.pendingCents], [2000, 500]);
    equal(totals.approvedCents, 12000);
    equal(totals.pendingCents, 500);
    equal(totals.approvedReports, 1);
    equal(totals.byPerson.map((p) => [p.label, p.approvedCents, p.pendingCents]), [["Ada Park", 12000, 500]]);
    equal(loadTotals("2026-07").approvedCents, 5000);
  });

  test("shiftMonth crosses years", () => {
    equal(shiftMonth("2026-01", -1), "2025-12");
    equal(shiftMonth("2026-12", 1), "2027-01");
  });
});
