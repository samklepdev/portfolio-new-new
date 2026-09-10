import { render, screen } from "@testing-library/react";
import { EMAIL, LOCATION } from "@/lib/siteLinks";
import { ContactMethods } from "./ContactMethods";

describe("ContactMethods", () => {
  it("links the email address", () => {
    render(<ContactMethods />);
    const link = screen.getByRole("link", { name: EMAIL });
    expect(link).toHaveAttribute("href", `mailto:${EMAIL}`);
  });

  it("renders the location as plain text, not a link", () => {
    render(<ContactMethods />);
    expect(screen.getByText(LOCATION)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: LOCATION })).toBeNull();
  });

  it("labels each row for screen readers and hides the icons from them", () => {
    const { container } = render(<ContactMethods />);
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2);
  });

  it("publishes no phone number", () => {
    const { container } = render(<ContactMethods />);
    expect(container.querySelector('a[href^="tel:"]')).toBeNull();
  });
});
