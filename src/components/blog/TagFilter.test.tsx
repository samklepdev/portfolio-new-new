import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TagFilter } from "./TagFilter";

const tags = [
  { name: "Next", slug: "next" },
  { name: "Design Systems", slug: "design-systems" },
];

describe("TagFilter", () => {
  it("renders nothing when there are no tags", () => {
    const { container } = render(<TagFilter tags={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links each tag to its filtered URL", () => {
    render(<TagFilter tags={tags} />);
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/blog?tag=next");
    expect(screen.getByRole("link", { name: "Design Systems" })).toHaveAttribute(
      "href",
      "/blog?tag=design-systems"
    );
  });

  it("links All to the unfiltered index and marks it current by default", () => {
    render(<TagFilter tags={tags} />);
    const all = screen.getByRole("link", { name: "All" });
    expect(all).toHaveAttribute("href", "/blog");
    expect(all).toHaveAttribute("aria-current", "page");
  });

  it("marks the active tag as current instead", () => {
    render(<TagFilter tags={tags} activeSlug="next" />);
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "All" })).not.toHaveAttribute("aria-current");
  });
});
