import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { EMAIL, LOCATION } from "@/lib/siteLinks";

vi.mock("@/app/actions/contact", () => ({
  submitContact: vi.fn(),
}));

import ContactPage from "@/app/contact/page";

describe("ContactPage", () => {
  it("has exactly one h1", () => {
    render(<ContactPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Get in touch" }),
    ).toBeInTheDocument();
  });

  it("states availability", () => {
    render(<ContactPage />);
    expect(screen.getByText("Available for work")).toBeInTheDocument();
  });

  it("renders the contact methods", () => {
    render(<ContactPage />);
    expect(screen.getByRole("link", { name: EMAIL })).toHaveAttribute(
      "href",
      `mailto:${EMAIL}`,
    );
    expect(screen.getByText(LOCATION)).toBeInTheDocument();
  });

  it("links home, the socials, and the resume", () => {
    render(<ContactPage />);
    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "LinkedIn" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toBeInTheDocument();

    const resume = screen.getByRole("link", { name: /resume/i });
    expect(resume).toHaveAttribute(
      "href",
      "/images/documents/samuel-klepper-resume.pdf",
    );
    expect(resume).toHaveAttribute("target", "_blank");
    expect(resume).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows the Ultra Demolition testimonial, not the one on the home page", () => {
    render(<ContactPage />);
    expect(screen.getByText("Xavier Chavaria")).toBeInTheDocument();
    expect(screen.queryByText("Martha DeLeon")).toBeNull();
  });

  it("renders the contact form fields", () => {
    render(<ContactPage />);
    expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Budget/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Website/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Message/)).toBeInTheDocument();
  });

  it("publishes no phone number", () => {
    const { container } = render(<ContactPage />);
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
  });
});
