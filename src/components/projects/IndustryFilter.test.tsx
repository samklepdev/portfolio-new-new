import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

import { IndustryFilter } from "./IndustryFilter";

const industries = [
  { name: "Real Estate", slug: "real-estate" },
  { name: "Food & Hospitality", slug: "food-hospitality" },
];

describe("IndustryFilter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders nothing when there are no industries", () => {
    const { container } = render(<IndustryFilter industries={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists every industry plus an 'All industries' default", () => {
    render(<IndustryFilter industries={industries} />);
    const select = screen.getByRole("combobox", { name: /industry/i });
    expect(select).toHaveValue("");
    expect(screen.getByRole("option", { name: "All industries" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Real Estate" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Food & Hospitality" })).toBeInTheDocument();
  });

  it("navigates to the filtered URL when an industry is chosen", () => {
    render(<IndustryFilter industries={industries} />);
    fireEvent.change(screen.getByRole("combobox", { name: /industry/i }), {
      target: { value: "real-estate" },
    });
    expect(mocks.push).toHaveBeenCalledWith("/projects?industry=real-estate");
  });

  it("navigates back to the unfiltered index when 'All industries' is chosen", () => {
    render(<IndustryFilter industries={industries} activeSlug="real-estate" />);
    const select = screen.getByRole("combobox", { name: /industry/i });
    expect(select).toHaveValue("real-estate");
    fireEvent.change(select, { target: { value: "" } });
    expect(mocks.push).toHaveBeenCalledWith("/projects");
  });
});
