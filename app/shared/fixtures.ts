import { sql, session, File } from "@elements/app";
import { Role, Category } from "#app/shared/format";
import { ExpenseForm } from "#app/shared/services/workflow";

/** Rows for tests. Each test runs in a transaction, so none of this persists. */
export function makeUser(name: string, role: Role = "employee"): { id: string; name: string; email: string } {
  let email = `${name.toLowerCase().replace(/\s+/g, ".")}@fixture.test`;

  return sql<{ id: string; name: string; email: string }>(`
    insert into users (email, name, role, passwordHash)
         values (${email}, ${name}, ${role}::userRole, crypt('pw', genSalt('bf', 4)))
      returning id, name, email
  `).firstOrThrow("user insert returned no row");
}

export function signInAs(user: { id: string; name: string }, role: Role = "employee") {
  session.logout();
  session.login({ userId: user.id, userName: user.name, role });
}

export function receiptFile(contentType = "image/png"): File {
  let data = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  return new File({ name: "receipt.png", size: data.length, contentType, data, lastModified: new Date() });
}

export function expenseForm(overrides: Partial<ExpenseForm> = {}): ExpenseForm {
  return {
    spentOn: "2026-09-10",
    merchant: "Fog City Coffee",
    amount: "12.40",
    category: "meals" as Category,
    note: "",
    receipt: receiptFile(),
    ...overrides,
  };
}
