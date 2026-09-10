import { render, screen } from "@testing-library/react";
import AboutPage from "@/app/about/page";

describe("AboutPage", () => {
  it("has exactly one h1", () => {
    render(<AboutPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("states availability", () => {
    render(<AboutPage />);
    expect(screen.getByText("Available for work")).toBeInTheDocument();
  });

  it("links the resume in a new tab", () => {
    render(<AboutPage />);
    const resume = screen.getByRole("link", { name: /resume/i });
    expect(resume).toHaveAttribute(
      "href",
      "/images/documents/samuel-klepper-resume.pdf",
    );
    expect(resume).toHaveAttribute("target", "_blank");
    expect(resume).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the timeline, stack, and both testimonials in page source", () => {
    const { container } = render(<AboutPage />);
    expect(container.querySelectorAll("ol li")).toHaveLength(4);
    expect(container.querySelectorAll("dd li")).toHaveLength(15);
    expect(container.querySelectorAll("blockquote")).toHaveLength(2);
  });

  it("exposes no tabs or other interaction gating content", () => {
    render(<AboutPage />);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });
});
