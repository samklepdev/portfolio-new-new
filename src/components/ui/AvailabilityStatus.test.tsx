import { render, screen } from "@testing-library/react";
import { AvailabilityStatus } from "@/components/ui/AvailabilityStatus";
import '@testing-library/jest-dom/vitest';

describe("AvailabilityStatus", () => {
  it("renders the availability label as text", () => {
    render(<AvailabilityStatus />);
    expect(screen.getByText("Available for work")).toBeInTheDocument();
  });

  it("appends a caller-supplied className to the root", () => {
    const { container } = render(<AvailabilityStatus className="spaced" />);
    expect(container.firstChild).toHaveClass("spaced");
  });

  it("hides the decorative dot from assistive tech", () => {
    const { container } = render(<AvailabilityStatus />);
    expect(container.querySelector("[aria-hidden='true']")).not.toBeNull();
  });
});
