import { render, screen } from "@testing-library/react";
import { Timeline } from "@/components/about/Timeline";

describe("Timeline", () => {
  it("lists all four roles, most recent first", () => {
    render(<Timeline />);
    const employers = screen.getAllByRole("heading", { level: 3 });
    expect(employers.map((h) => h.textContent)).toEqual([
      "BuildOn Technologies",
      "Gulf Winds International",
      "Bouncing Pixel",
      "WealthGuard Insurance Group",
    ]);
  });

  it("renders as an ordered list", () => {
    const { container } = render(<Timeline />);
    expect(container.querySelector("ol")).not.toBeNull();
    expect(container.querySelectorAll("li")).toHaveLength(4);
  });

  it("titles every role Software Engineer", () => {
    render(<Timeline />);
    expect(screen.getAllByText("Software Engineer")).toHaveLength(4);
  });

  it("shows each date range", () => {
    render(<Timeline />);
    expect(screen.getByText("Nov 2025 — Sep 2026")).toBeInTheDocument();
    expect(screen.getByText("May 2024 — Jun 2025")).toBeInTheDocument();
    expect(screen.getByText("Feb 2022 — Apr 2024")).toBeInTheDocument();
    expect(screen.getByText("Jul 2021 — Feb 2022")).toBeInTheDocument();
  });
});
