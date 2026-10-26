import { afterEach, describe, expect, it } from "vitest";
import { rateLimit, clearRateLimit, resetRateLimitStore } from "./rateLimit";

afterEach(() => resetRateLimitStore());

describe("rateLimit", () => {
  it("allows the first 10 attempts and blocks the 11th", () => {
    for (let i = 0; i < 10; i += 1) {
      expect(rateLimit("1.2.3.4").allowed).toBe(true);
    }
    const blocked = rateLimit("1.2.3.4");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    for (let i = 0; i < 11; i += 1) rateLimit("a");
    expect(rateLimit("b").allowed).toBe(true);
  });

  it("resets after the window elapses", () => {
    const start = 1_000_000;
    for (let i = 0; i < 11; i += 1) rateLimit("ip", start);
    expect(rateLimit("ip", start).allowed).toBe(false);
    // 15 minutes + 1ms later
    expect(rateLimit("ip", start + 15 * 60 * 1000 + 1).allowed).toBe(true);
  });

  it("clearRateLimit drops a key so a correct login resets the counter", () => {
    for (let i = 0; i < 10; i += 1) rateLimit("ip");
    clearRateLimit("ip");
    expect(rateLimit("ip").allowed).toBe(true);
  });
});
