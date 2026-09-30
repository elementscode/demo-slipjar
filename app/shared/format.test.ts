import { test, equal } from "@elements/app";
import { parseAmount, formatMoney, formatDay, statusPill } from "#app/shared/format";

test("format", () => {
  test("parseAmount reads what people type", () => {
    equal(parseAmount("42.5"), 4250);
    equal(parseAmount("$1,204.99"), 120499);
    equal(parseAmount(" 18 "), 1800);
    equal(parseAmount("0"), null);
    equal(parseAmount("12.345"), null);
    equal(parseAmount("abc"), null);
    equal(parseAmount("-4"), null);
  });

  test("formatMoney", () => {
    equal(formatMoney(103870), "$1,038.70");
    equal(formatMoney(5), "$0.05");
  });

  test("formatDay does not shift with the timezone", () => {
    equal(formatDay("2026-09-01"), "Sep 1, 2026");
  });

  test("statusPill", () => {
    equal(statusPill("approved"), "pill is-success");
    equal(statusPill("draft"), "pill");
  });
});
