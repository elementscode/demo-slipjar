![Expense reports with receipt photos, built by Claude Code on Elements: the approver's queue with reports waiting for a decision, how long each has waited, and recently decided reports marked Approved or Sent back.](https://elements.dev/demos/01a0f3fa-0bc6-7b70-8739-3a0d9aa1467b/poster?v=d36d012f7f48)

# Expense reports with receipt photos, built by Claude Code on Elements

> Slipjar is a full-stack app built with Claude Code on Elements.

Expenses with receipt photos, reports that approvers approve or send back with a comment, monthly totals, and email, all live.

[Run this app on your machine](https://elements.dev/demos/01a0f3fa-0bc6-7b70-8739-3a0d9aa1467b). Use this demo as inspiration, or as the starting point for your own app. Your agent creates a new app with this one as the scaffold, and you prompt it to add whatever features you want.

## How it's built

Slipjar needed expenses with receipt photos, reports that move from draft to approved or sent back, emails at each step, monthly totals and pages that stay current for both employees and approvers. Each of those is a part of Elements, so the agent spent its 22 minutes on the workflow itself.

- **Reports that update in place.** A channel carries each report's new summary whenever it changes. An employee's list, the approver's queue, the report page and the monthly totals all listen, so a decision shows up on every open screen as it happens.

- **Receipt photos from the form.** An employee adds an expense with its receipt photo straight from a form, and the image is stored with the expense in one transaction and shown only to its owner and approvers.

- **An approval workflow.** A draft is submitted, then approved or sent back with a comment. Exactly one approver decides, and each report goes to an approver other than its owner.

- **Background work.** Jobs email the approvers when a report is submitted and the employee when it is decided.

- **Server calls as function calls.** Adding expenses, building reports, submitting, deciding and the monthly totals call server functions straight from the page with `@rpc`. Totals count approved spending by category, with submitted amounts shown as pending.

- **Data and roles from SQL.** Migrations define the workflow and seed two approvers, five employees and reports in every status, with receipts. Sessions and roles keep the queue with the approvers.

## Why Elements

Elements is an integrated full-stack app framework and a project server. The project server checks the agent's work as it builds: it type-checks the server and browser code, analyzes the program, applies migrations and runs the tests, then reports the results to the agent. A security mistake, such as calling a server-only function from the browser, is a compile error. The agent reads the report and fixes its own mistakes before it tells you a feature is done. The same checks run on every feature you ask for next.
