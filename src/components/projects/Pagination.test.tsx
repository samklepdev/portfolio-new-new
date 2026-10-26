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

  it("keeps extra query params on every page link", () => {
    render(
      <Pagination
        page={2}
        totalPages={3}
        basePath="/projects"
        query={{ tag: "react" }}
      />
    );
    // Page 1 keeps the filter but still drops ?page=.
    expect(screen.getByRole("link", { name: "Page 1" })).toHaveAttribute(
      "href",
      "/projects?tag=react"
    );
    expect(screen.getByRole("link", { name: "Page 3" })).toHaveAttribute(
      "href",
      "/projects?tag=react&page=3"
    );
  });
});
