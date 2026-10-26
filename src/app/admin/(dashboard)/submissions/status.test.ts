import { describe, expect, it } from "vitest";
import { deliveryStatus } from "./status";

describe("deliveryStatus", () => {
  it("is failed when there is an email error", () => {
    expect(deliveryStatus({ emailedAt: "2026-02-01T00:00:00Z", emailError: "550 rejected" })).toBe("failed");
  });
  it("is delivered when emailed and no error", () => {
    expect(deliveryStatus({ emailedAt: "2026-02-01T00:00:00Z", emailError: null })).toBe("delivered");
  });
  it("is pending when neither", () => {
    expect(deliveryStatus({ emailedAt: null, emailError: null })).toBe("pending");
  });
});
