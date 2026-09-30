import { test, equal } from "@elements/app";
import { makeUser, signInAs, expenseForm } from "#app/shared/fixtures";
import { addExpense, createReport } from "#app/shared/services/workflow";
import { reportsFor, unfiledExpenses } from "#app/shared/services/reports";

test("home", () => {
  test("shows only your own expenses and reports", () => {
    let ada = makeUser("Ada Park");
    let ben = makeUser("Ben Ito");

    signInAs(ada);
    let [first] = addExpense(expenseForm({ merchant: "Tartine" }));
    addExpense(expenseForm({ merchant: "Philz" }));
    createReport("Coffee", [first.id]);

    signInAs(ben);
    addExpense(expenseForm({ merchant: "City Cab" }));

    equal(unfiledExpenses(ada.id).map((e) => e.merchant), ["Philz"]);
    equal(reportsFor(ada.id).map((r) => r.title), ["Coffee"]);
    equal(reportsFor(ben.id).length, 0);
  });

  test("a report summary totals its expenses", () => {
    let ada = makeUser("Ada Park");
    signInAs(ada);
    let ids = [
      addExpense(expenseForm({ amount: "10" }))[0].id,
      addExpense(expenseForm({ amount: "2.50" }))[0].id,
    ];

    createReport("Two", ids);

    let [report] = reportsFor(ada.id);
    equal(report.totalCents, 1250);
    equal(report.expenseCount, 2);
    equal(report.ownerName, "Ada Park");
  });
});
