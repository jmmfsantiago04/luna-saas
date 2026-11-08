import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildClientsHref, parseClientListParams } from "./filters";

describe("parseClientListParams", () => {
  it("defaults", () => {
    assert.deepEqual(parseClientListParams({}), { q: "", tag: "", status: "active", page: 1 });
  });
  it("trims, truncates and takes first of arrays", () => {
    const p = parseClientListParams({ q: ["  ana  ", "x"], tag: " vip ", status: "archived", page: "3" });
    assert.deepEqual(p, { q: "ana", tag: "vip", status: "archived", page: 3 });
    assert.equal(parseClientListParams({ q: "a".repeat(500) }).q.length, 100);
    assert.equal(parseClientListParams({ tag: "b".repeat(500) }).tag.length, 40);
  });
  it("rejects bad status/page", () => {
    const p = parseClientListParams({ status: "hack", page: "-2" });
    assert.equal(p.status, "active");
    assert.equal(p.page, 1);
    assert.equal(parseClientListParams({ page: "1.5" }).page, 1);
    assert.equal(parseClientListParams({ page: "abc" }).page, 1);
  });
});

describe("buildClientsHref", () => {
  it("omits defaults and encodes values", () => {
    assert.equal(buildClientsHref("acme", {}), "/app/acme/clients");
    assert.equal(
      buildClientsHref("acme", { q: "a&b", tag: "vip cliente", status: "archived", page: 2 }),
      "/app/acme/clients?q=a%26b&tag=vip+cliente&status=archived&page=2",
    );
    assert.equal(buildClientsHref("acme", { status: "active", page: 1 }), "/app/acme/clients");
  });
});
