import { sql, session, AuthError, ForbiddenError } from "@elements/app";
import { Role } from "#app/shared/format";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface SigninForm {
  email: string;
  password: string;
  error: string;
}

/**
 * The signed-in user, read from the table on every request so a role change
 * takes effect without signing out.
 */
export function currentUser(): CurrentUser | undefined {
  let userId = session.get("userId");

  if (!userId) {
    return undefined;
  }

  return sql<CurrentUser>(`select id, name, email, role from users where id = ${userId}`).first();
}

export function requireUser(): CurrentUser {
  let user = currentUser();

  if (!user) {
    throw new AuthError("sign in to continue");
  }

  return user;
}

export function requireApprover(): CurrentUser {
  let user = requireUser();

  if (user.role !== "approver") {
    throw new ForbiddenError("approver access required");
  }

  return user;
}

/** @rpc */
export function signin(form: SigninForm) {
  let address = form.email.trim().toLowerCase();

  if (!address || !form.password) {
    throw new AuthError("Enter your email and password.");
  }

  let user = sql<CurrentUser>(`
    select id, name, email, role from users
     where email = ${address}
       and passwordHash = crypt(${form.password}, passwordHash)
  `).first();

  if (!user) {
    throw new AuthError("That email and password do not match.");
  }

  session.login({ userId: user.id, userName: user.name, role: user.role });
}

/** @rpc */
export function signout() {
  session.logout();
}
