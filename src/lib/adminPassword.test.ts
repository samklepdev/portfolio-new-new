import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./adminPassword";

describe("adminPassword", () => {
  it("verifies a correct password against its own hash", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(verifyPassword("wrong password", stored)).toBe(false);
  });

  it("produces a salt:hash shape with a unique salt each call", () => {
    const a = hashPassword("same");
    const b = hashPassword("same");
    expect(a).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(a).not.toBe(b); // random salt
    expect(verifyPassword("same", a)).toBe(true);
    expect(verifyPassword("same", b)).toBe(true);
  });

  it("returns false (never throws) for malformed stored values", () => {
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "no-colon")).toBe(false);
    expect(verifyPassword("x", "salt:")).toBe(false);
    expect(verifyPassword("x", ":hash")).toBe(false);
  });
});
