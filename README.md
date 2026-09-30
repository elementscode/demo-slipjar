# Slipjar

> A demo app built with [Elements](https://elements.dev).

Employees submit expense reports with receipt photos, and approvers approve or send them back with a comment, with live status, email at each step and monthly totals.

**Demo:** [Slipjar](TBD)

## Agent specs

What one run of the prompt below took, from an empty Elements project to this
app.

- **Agent:** Claude Code, Opus 5.5 Medium
- **Time:** 22 min
- **Cost:** $6.93 at API rates, September 2026

## Get started

```bash
elements create slipjar -scaffold=elementscode/demo-slipjar
```

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

## The prompt

```text
Build an expense report app named slipjar for a company of about thirty people.

Two kinds of accounts: employee and approver. An approver can also submit.

EMPLOYEE
- Add an expense: date, merchant, amount, category (travel, meals, software,
  supplies, other), a note, and a photo of the receipt.
- Group expenses into a report and submit it.
- See each report's status and any approver comments.

APPROVER
- Queue of submitted reports.
- Open a report, see each receipt image, approve or send it back with a
  comment.
- Monthly totals by category and by person.

Email the employee when a report is approved or sent back, and approvers when
one is submitted.

Seed two approvers, five employees, and a dozen reports across statuses with
receipt images. Show the seeded logins on the sign-in page.

Report status updates in real time.
```

## License

MIT. See [LICENSE](LICENSE).
