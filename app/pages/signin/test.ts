import { test, equal, assert, session, AuthError } from "@elements/app";
import { signin } from "#app/shared/services/auth";
import { makeUser } from "#app/shared/fixtures";

async function rejects(fn: () => Promise<unknown> | unknown): Promise<boolean> {
  try {
    await fn();
  } catch (err) {
    return err instanceof AuthError;
  }

  return false;
}

test("signin", () => {
  test("signs in with any casing of the email", () => {
    let ada = makeUser("Ada Park", "approver");

    signin({ email: "  ADA.PARK@fixture.test ", password: "pw", error: "" });

    equal(session.get("userId"), ada.id);
    equal(session.get("role"), "approver");
  });

  test("a wrong password does not say which part was wrong", async () => {
    makeUser("Ada Park");

    assert(await rejects(() => signin({ email: "ada.park@fixture.test", password: "nope", error: "" })));
    assert(await rejects(() => signin({ email: "nobody@fixture.test", password: "pw", error: "" })));
    assert(!session.isLoggedIn());
  });
});
