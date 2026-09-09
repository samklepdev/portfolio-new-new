import { render, screen } from "@testing-library/react";
import { Testimonials } from "@/components/about/Testimonials";

describe("Testimonials", () => {
  it("renders both testimonials as figures", () => {
    const { container } = render(<Testimonials />);
    expect(container.querySelectorAll("figure")).toHaveLength(2);
    expect(container.querySelectorAll("blockquote")).toHaveLength(2);
  });

  it("attributes each quote to a person, title, and company", () => {
    render(<Testimonials />);
    expect(screen.getByText("Xavier Chavaria")).toBeInTheDocument();
    expect(screen.getByText("Owner/Operator")).toBeInTheDocument();
    expect(screen.getByText("Ultra Demolition")).toBeInTheDocument();
    expect(screen.getByText("Martha DeLeon")).toBeInTheDocument();
    expect(screen.getByText("CEO")).toBeInTheDocument();
    expect(screen.getByText("DeLeon Safety Solutions")).toBeInTheDocument();
  });

  it("marks client logos decorative", () => {
    const { container } = render(<Testimonials />);
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(2);
    for (const image of images) {
      expect(image.getAttribute("alt")).toBe("");
    }
  });

  it("renders a star row beside each quote", () => {
    render(<Testimonials />);
    const ratings = screen.getAllByLabelText(/out of 5 stars/i);
    expect(ratings).toHaveLength(2);
    for (const rating of ratings) {
      expect(rating.textContent).toBe("★★★★★");
    }
  });
});
