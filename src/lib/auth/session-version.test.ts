import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isJwtSessionVersionValid } from "./session-version";

describe("isJwtSessionVersionValid", () => {
  it("rejects missing token version (old JWTs)", () => {
    assert.equal(isJwtSessionVersionValid(undefined, 0), false);
    assert.equal(isJwtSessionVersionValid(null, 0), false);
    assert.equal(isJwtSessionVersionValid("0", 0), false);
  });

  it("rejects mismatched version after password reset", () => {
    assert.equal(isJwtSessionVersionValid(0, 1), false);
    assert.equal(isJwtSessionVersionValid(2, 3), false);
  });

  it("accepts matching version from new login", () => {
    assert.equal(isJwtSessionVersionValid(0, 0), true);
    assert.equal(isJwtSessionVersionValid(1, 1), true);
    assert.equal(isJwtSessionVersionValid(7, 7), true);
  });

  it("rejects invalid db or negative values", () => {
    assert.equal(isJwtSessionVersionValid(0, null), false);
    assert.equal(isJwtSessionVersionValid(0, undefined), false);
    assert.equal(isJwtSessionVersionValid(-1, -1), false);
    assert.equal(isJwtSessionVersionValid(1.5, 1.5), false);
  });
});