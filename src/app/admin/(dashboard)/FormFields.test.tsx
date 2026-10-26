import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TextField, CheckboxField, SelectField } from "./FormFields";

describe("FormFields", () => {
  it("TextField reports typed value", () => {
    const onChange = vi.fn();
    render(<TextField id="t" label="Title" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Hi" } });
    expect(onChange).toHaveBeenCalledWith("Hi");
  });

  it("CheckboxField reports boolean", () => {
    const onChange = vi.fn();
    render(<CheckboxField id="f" label="Featured" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Featured"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("SelectField reports selected value", () => {
    const onChange = vi.fn();
    render(
      <SelectField id="s" label="Status" value="published" onChange={onChange}
        options={[{ value: "published", label: "Published" }, { value: "draft", label: "Draft" }]} />,
    );
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "draft" } });
    expect(onChange).toHaveBeenCalledWith("draft");
  });
});
