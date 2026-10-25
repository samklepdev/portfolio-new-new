import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("renders nothing under two pages", () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} basePath="/blog" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("defaults its label so existing call sites are unchanged", () => {
    render(<Pagination page={1} totalPages={3} basePath="/projects" />);
    expect(screen.getByRole("navigation", { name: "Projects pagination" })).toBeInTheDocument();
  });

  it("accepts a custom label", () => {
    render(<Pagination page={1} totalPages={3} basePath="/blog" label="Blog pagination" />);
    expect(screen.getByRole("navigation", { name: "Blog pagination" })).toBeInTheDocument();
  });

  it("builds hrefs from basePath and omits ?page= for page 1", () => {
    render(<Pagination page={2} totalPages={3} basePath="/blog" label="Blog pagination" />);
    expect(screen.getByRole("link", { name: "Page 1" })).toHaveAttribute("href", "/blog");
    expect(screen.getByRole("link", { name: "Page 3" })).toHaveAttribute("href", "/blog?page=3");
  });
});
