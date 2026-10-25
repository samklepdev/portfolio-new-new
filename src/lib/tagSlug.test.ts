import { describe, expect, it } from "vitest";
import { tagSlug } from "./tagSlug";

describe("tagSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(tagSlug("Design Systems")).toBe("design-systems");
    expect(tagSlug("Next")).toBe("next");
  });

  it("collapses runs of punctuation into one hyphen", () => {
    expect(tagSlug("CI / CD")).toBe("ci-cd");
    expect(tagSlug("C#")).toBe("c");
  });

  it("trims leading and trailing hyphens", () => {
    expect(tagSlug("  spaced  ")).toBe("spaced");
    expect(tagSlug(".NET")).toBe("net");
  });
});
