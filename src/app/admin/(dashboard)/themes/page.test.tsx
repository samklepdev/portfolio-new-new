import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(), del: vi.fn(), activate: vi.fn(), useDefault: vi.fn(),
}));
vi.mock("@/services/ThemeService", () => ({
  default: class {
    list = mocks.list; delete = mocks.del; activate = mocks.activate; useDefault = mocks.useDefault;
  },
}));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import ThemesListPage from "./page";

const themes = [
  { id: 1, name: "Default Neon", isActive: true, background: "#0b0e14", foreground: "#ffffff",
    turquoise: "#00f0ff", pink: "#ff2e97", purple: "#b026ff", green: "#39ff88" },
  { id: 2, name: "Sunset", isActive: false, background: "#101010", foreground: "#fafafa",
    turquoise: "#11ccdd", pink: "#ee3388", purple: "#9922ee", green: "#22dd77" },
];

describe("ThemesListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue(themes);
  });

  it("renders a row per theme and marks the active one", async () => {
    render(<ThemesListPage />);
    await waitFor(() => expect(screen.getByText("Default Neon")).toBeInTheDocument());
    expect(screen.getByText("Sunset")).toBeInTheDocument();
    expect(screen.getByText(/^active$/i)).toBeInTheDocument();
  });

  it("activates a theme through the service", async () => {
    mocks.activate.mockResolvedValue(undefined);
    render(<ThemesListPage />);
    await waitFor(() => expect(screen.getByText("Sunset")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /activate sunset/i }));
    await waitFor(() => expect(mocks.activate).toHaveBeenCalledWith("2"));
  });

  it("reverts to default through the service", async () => {
    mocks.useDefault.mockResolvedValue(undefined);
    render(<ThemesListPage />);
    await waitFor(() => expect(screen.getByText("Default Neon")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /use default theme/i }));
    await waitFor(() => expect(mocks.useDefault).toHaveBeenCalled());
  });
});
