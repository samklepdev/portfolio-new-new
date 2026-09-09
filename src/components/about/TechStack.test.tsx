import { render, screen } from "@testing-library/react";
import { TechStack } from "@/components/about/TechStack";

const EXPECTED: Record<string, readonly string[]> = {
  Languages: ["TypeScript", "JavaScript", "C#", "HTML", "CSS"],
  Frontend: ["React", "Next.js", "Redux"],
  Backend: ["Node.js", "Express", ".NET"],
  Data: ["PostgreSQL", "MongoDB"],
  Tooling: ["Git", "Heroku"],
};

describe("TechStack", () => {
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

  it("maps each group to its exact set of technologies, in order", () => {
    const { container } = render(<TechStack />);
    const groupEls = container.querySelectorAll("dl > div");

    const actual: Record<string, string[]> = {};
    let total = 0;
    for (const groupEl of groupEls) {
      const label = groupEl.querySelector("dt")?.textContent ?? "";
      const items = Array.from(groupEl.querySelectorAll("dd li")).map(
        (li) => li.textContent ?? "",
      );
      actual[label] = items;
      total += items.length;
    }

    expect(Object.keys(actual)).toEqual(Object.keys(EXPECTED));
    for (const [label, items] of Object.entries(EXPECTED)) {
      expect(actual[label]).toEqual(items);
    }
    expect(total).toBe(15);
  });

  it("renders no images", () => {
    const { container } = render(<TechStack />);
    expect(container.querySelectorAll("img, svg")).toHaveLength(0);
  });
});
