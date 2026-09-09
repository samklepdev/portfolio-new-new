import { render, screen } from "@testing-library/react";
import { TechStack } from "@/components/about/TechStack";

describe("TechStack", () => {
  it("renders all fifteen technologies", () => {
    const { container } = render(<TechStack />);
    expect(container.querySelectorAll("dd li")).toHaveLength(15);
  });

  it("groups them under five headings", () => {
    render(<TechStack />);
    for (const group of [
      "Languages",
      "Frontend",
      "Backend",
      "Data",
      "Tooling",
    ]) {
      expect(screen.getByText(group)).toBeInTheDocument();
    }
  });

  it("names the technologies the spec lists", () => {
    render(<TechStack />);
    for (const tech of ["TypeScript", "React", "Next.js", "C#", ".NET", "PostgreSQL"]) {
      expect(screen.getByText(tech)).toBeInTheDocument();
    }
  });

  it("renders no images", () => {
    const { container } = render(<TechStack />);
    expect(container.querySelectorAll("img, svg")).toHaveLength(0);
  });
});
