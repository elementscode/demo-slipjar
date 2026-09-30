![Slipjar, an expense report app built with Elements: the approver's queue with reports waiting for a decision, how long each has waited, and recently decided reports marked Approved or Sent back.](https://elements.dev/demos/01a0f3fa-0bc6-7b70-8739-3a0d9aa1467b/poster?v=d36d012f7f48)

# Slipjar

> A demo app built with [Elements](https://elements.dev).

Expenses with receipt photos, reports that approvers approve or send back with a comment, monthly totals, and email, all live.

**Demo:** [Slipjar](https://elements.dev/demos/01a0f3fa-0bc6-7b70-8739-3a0d9aa1467b)

## Agent specs

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 22 min
- **Cost:** $6.93 at API rates, September 2026

## Get started

```bash
elements create slipjar -scaffold=elementscode/demo-slipjar
```

## How it's built

Slipjar needed expenses with receipt photos, reports that move from draft to approved or sent back, emails at each step, monthly totals and pages that stay current for both employees and approvers. Each of those is a part of Elements, so the agent spent its 22 minutes on the workflow itself.

### What Elements gave the app

- **Reports that update in place.** A channel carries each report's new summary whenever it changes. An employee's list, the approver's queue, the report page and the monthly totals all listen, so a decision shows up on every open screen as it happens.

- **Receipt photos from the form.** An employee adds an expense with its receipt photo straight from a form, and the image is stored with the expense in one transaction and shown only to its owner and approvers.

- **An approval workflow.** A draft is submitted, then approved or sent back with a comment. Exactly one approver decides, and each report goes to an approver other than its owner.

- **Background work.** Jobs email the approvers when a report is submitted and the employee when it is decided.

- **Server calls as function calls.** Adding expenses, building reports, submitting, deciding and the monthly totals call server functions straight from the page with `@rpc`. Totals count approved spending by category, with submitted amounts shown as pending.

- **Data and roles from SQL.** Migrations define the workflow and seed two approvers, five employees and reports in every status, with receipts. Sessions and roles keep the queue with the approvers.

### What the project server gave the agent

The project server runs alongside the agent and answers as soon as a file is saved: it type-checks the templates, TypeScript and SQL, applies migrations and reruns the tests, so every question came back right away and the agent kept building.

### What shipped

The app type-checks with zero errors and all 25 tests pass. Every page works on desktop and phone.

## Demo accounts

The seed creates two approvers, five employees and 13 reports from July to
September: 2 drafts, 4 waiting for approval, 5 approved and 2 sent back with a
comment, plus a few expenses not on a report yet. Every expense has a drawn
receipt image. Every account's password is `receipts`, and the sign-in page
lists them.

| Email              | Name          | Role     |
| ------------------ | ------------- | -------- |
| maya@slipjar.test  | Maya Chen     | approver |
| omar@slipjar.test  | Omar Haddad   | approver |
| jonas@slipjar.test | Jonas Berg    | employee |
| lena@slipjar.test  | Lena Okafor   | employee |
| priya@slipjar.test | Priya Patel   | employee |
| sam@slipjar.test   | Sam Rivera    | employee |
| theo@slipjar.test  | Theo Nakamura | employee |

Approvers can submit their own reports; the other approver decides on them.
In development, emails are written to `.elements/logs/job.log` instead of
sent.

**Demo:** [Slipjar](https://elements.dev/demos/01a0f3fa-0bc6-7b70-8739-3a0d9aa1467b)

## License

MIT. See [LICENSE](LICENSE).
