import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CLIENT_NAME_MAX,
  clientFieldsSchema,
  parseClientFields,
} from "./validation";

const base = {
  name: "Maria Silva",
  type: "person" as const,
};

describe("clientFieldsSchema", () => {
  it("accepts valid person and company", () => {
    const person = parseClientFields({ ...base });
    assert.equal(person.success, true);
    if (person.success) {
      assert.equal(person.data.name, "Maria Silva");
      assert.equal(person.data.type, "person");
      assert.equal(person.data.email, null);
      assert.equal(person.data.phone, null);
      assert.equal(person.data.contact, null);
      assert.equal(person.data.source, null);
      assert.equal(person.data.notes, null);
    }

    const company = parseClientFields({ name: "Acme Ltda", type: "company" });
    assert.equal(company.success, true);
    if (company.success) assert.equal(company.data.type, "company");
  });

  it("trims name and rejects empty/whitespace name", () => {
    const ok = parseClientFields({ name: "  João  ", type: "person" });
    assert.equal(ok.success, true);
    if (ok.success) assert.equal(ok.data.name, "João");

    assert.equal(parseClientFields({ name: "", type: "person" }).success, false);
    assert.equal(parseClientFields({ name: "   ", type: "person" }).success, false);
    assert.equal(parseClientFields({ type: "person" }).success, false);
  });

  it("rejects missing/invalid type", () => {
    assert.equal(parseClientFields({ name: "X" }).success, false);
    assert.equal(parseClientFields({ name: "X", type: "other" }).success, false);
    assert.equal(parseClientFields({ name: "X", type: 1 }).success, false);
  });

  it("maps empty/whitespace optionals to null", () => {
    const parsed = parseClientFields({
      ...base,
      email: "  ",
      phone: "",
      contact: null,
      source: undefined,
      notes: "\t\n",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.email, null);
      assert.equal(parsed.data.phone, null);
      assert.equal(parsed.data.contact, null);
      assert.equal(parsed.data.source, null);
      assert.equal(parsed.data.notes, null);
    }
  });

  it("validates and normalizes nonempty email; rejects invalid", () => {
    const ok = parseClientFields({ ...base, email: "  Maria.Silva@Email.COM " });
    assert.equal(ok.success, true);
    if (ok.success) assert.equal(ok.data.email, "maria.silva@email.com");

    assert.equal(parseClientFields({ ...base, email: "not-an-email" }).success, false);
    assert.equal(parseClientFields({ ...base, email: "a@" }).success, false);
  });

  it("rejects oversize name and optionals", () => {
    assert.equal(
      parseClientFields({ name: "a".repeat(CLIENT_NAME_MAX + 1), type: "person" }).success,
      false,
    );
    assert.equal(parseClientFields({ ...base, phone: "1".repeat(41) }).success, false);
    assert.equal(parseClientFields({ ...base, notes: "n".repeat(5001) }).success, false);
  });

  it("rejects non-string optionals and unexpected keys (strict)", () => {
    assert.equal(parseClientFields({ ...base, phone: 11999999999 }).success, false);
    assert.equal(parseClientFields({ ...base, email: { a: 1 } }).success, false);
    assert.equal(
      parseClientFields({ ...base, organizationId: "should-not-pass" }).success,
      false,
    );
    assert.equal(clientFieldsSchema.safeParse({ ...base, extra: true }).success, false);
  });
});