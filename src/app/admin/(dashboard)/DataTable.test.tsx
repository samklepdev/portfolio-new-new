import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DataTable, { type Column } from "./DataTable";

interface Row {
  id: number;
  name: string;
  score: number;
}

const rows: Row[] = [
  { id: 1, name: "Charlie", score: 30 },
  { id: 2, name: "Alice", score: 10 },
  { id: 3, name: "Bob", score: 20 },
];

const columns: Column<Row>[] = [
  { key: "name", header: "Name", sort: (r) => r.name, cell: (r) => r.name },
  { key: "score", header: "Score", sort: (r) => r.score, cell: (r) => r.score },
];

function names() {
  return within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1) // drop the header row
    .map((tr) => tr.querySelector("td")?.textContent);
}

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) {
  return render(
    <DataTable
      columns={columns}
      rows={rows}
      getKey={(r) => r.id}
      search={(r) => r.name}
      initialPageSize={10}
      {...props}
    />,
  );
}

describe("DataTable", () => {
  it("renders every row in the given order by default", () => {
    renderTable();
    expect(names()).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("sorts ascending then descending when a sortable header is clicked", () => {
    renderTable();
    const nameHeader = screen.getByRole("button", { name: /name/i });
    fireEvent.click(nameHeader);
    expect(names()).toEqual(["Alice", "Bob", "Charlie"]);
    fireEvent.click(nameHeader);
    expect(names()).toEqual(["Charlie", "Bob", "Alice"]);
  });

  it("filters rows by the search text", () => {
    renderTable();
    fireEvent.change(screen.getByRole("searchbox", { name: /search table/i }), {
      target: { value: "li" },
    });
    expect(names()).toEqual(["Charlie", "Alice"]);
    expect(screen.getByText(/showing 1 to 2 of 2 entries/i)).toBeInTheDocument();
  });

  it("paginates and moves between pages", () => {
    renderTable({ initialPageSize: 2 });
    expect(names()).toEqual(["Charlie", "Alice"]);
    expect(screen.getByText(/showing 1 to 2 of 3 entries/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(names()).toEqual(["Bob"]);
    expect(screen.getByText(/showing 3 to 3 of 3 entries/i)).toBeInTheDocument();
  });

  it("shows the no-matches message when a search excludes everything", () => {
    renderTable();
    fireEvent.change(screen.getByRole("searchbox", { name: /search table/i }), {
      target: { value: "zzz" },
    });
    expect(screen.getByText(/no matches/i)).toBeInTheDocument();
  });

  it("shows the empty label when there are no rows at all", () => {
    renderTable({ rows: [], emptyLabel: "Nothing to see." });
    expect(screen.getByText("Nothing to see.")).toBeInTheDocument();
  });
});
