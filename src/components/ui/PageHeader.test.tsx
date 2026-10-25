import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the title as the only h1", () => {
    render(<PageHeader title="Projects" backLinkText="Home" />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Projects");
  });

  it("adds no extra headings from the decorative backdrop", () => {
    render(<PageHeader title="Projects" backLinkText="Home" />);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("renders the back link with the given text and a default href of /", () => {
    render(<PageHeader title="Projects" backLinkText="Home" />);
    expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute("href", "/");
  });

  it("uses backLinkHref when provided", () => {
    render(<PageHeader title="Hello World" backLinkText="Blog" backLinkHref="/blog" />);
    expect(screen.getByRole("link", { name: /Blog/ })).toHaveAttribute("href", "/blog");
  });

  it("renders the subtitle only when provided", () => {
    const { rerender } = render(<PageHeader title="About" backLinkText="Home" />);
    expect(screen.queryByText("A short lede.")).not.toBeInTheDocument();
    rerender(<PageHeader title="About" backLinkText="Home" subtitle="A short lede." />);
    expect(screen.getByText("A short lede.")).toBeInTheDocument();
  });

  it("renders children in the content slot", () => {
    render(
      <PageHeader title="Projects" backLinkText="Home">
        <div data-testid="slot">extra</div>
      </PageHeader>,
    );
    expect(screen.getByTestId("slot")).toBeInTheDocument();
  });
});
