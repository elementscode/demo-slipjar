import { Request, Response, redirect, session, sql } from "@elements/app";
import html, { DemoLogin } from "./template";

export default function route(req: Request, res: Response) {
  if (session.isLoggedIn()) {
    redirect("/");
    return;
  }

  // The seeded accounts exist only in development, so the list is empty
  // anywhere else and the panel does not render.
  let demoLogins = process.env.ENV === "development"
    ? sql<DemoLogin>(`
        select id, name, email, role from users
         where email like '%@slipjar.test'
         order by role desc, name
      `).all()
    : [];

  return new html({ demoLogins });
}
