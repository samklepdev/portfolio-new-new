import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ apply: vi.fn(), store: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/themeApply", () => ({
  THEME_STORAGE_KEY: "portfolio-theme",
  applyThemeStyle: mocks.apply,
  storeThemeId: mocks.store,
  readStoredThemeId: mocks.read,
}));

import { ThemeSwitcher } from "./ThemeSwitcher";
import type { PublicTheme } from "@/services/types";

const themes: PublicTheme[] = [
  { id: 1, name: "CyberPunk", isActive: true, style: { "--neon-turquoise": "#00f0ff" } },
  { id: 2, name: "Ember", isActive: false, style: { "--neon-turquoise": "#ff7a18" } },
  { id: 3, name: "Synthwave", isActive: false, style: { "--neon-turquoise": "#c05cff" } },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockReturnValue(null);
});

describe("ThemeSwitcher", () => {
  it("renders nothing when there are no public themes", () => {
    const { container } = render(<ThemeSwitcher themes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opens the menu and lists every public theme", () => {
    render(<ThemeSwitcher themes={themes} />);
    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));
    expect(screen.getByRole("option", { name: /cyberpunk/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /ember/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /synthwave/i })).toBeInTheDocument();
  });

  it("applies vars and stores the id when a theme is picked", () => {
    render(<ThemeSwitcher themes={themes} />);
    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));
    fireEvent.click(screen.getByRole("option", { name: /ember/i }));
    expect(mocks.apply).toHaveBeenCalledWith(document.documentElement, themes[1].style);
    expect(mocks.store).toHaveBeenCalledWith(2);
  });

  it("highlights the active theme initially", () => {
    render(<ThemeSwitcher themes={themes} />);
    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));
    expect(screen.getByRole("option", { name: /cyberpunk/i })).toHaveAttribute("aria-selected", "true");
  });

  it("reconciles the highlight to a stored id after mount", async () => {
    mocks.read.mockReturnValue(3);
    render(<ThemeSwitcher themes={themes} />);
    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));
    await waitFor(() =>
      expect(screen.getByRole("option", { name: /synthwave/i })).toHaveAttribute("aria-selected", "true"),
    );
  });

  it("falls back to active when the stored id is not a public theme", () => {
    mocks.read.mockReturnValue(999);
    render(<ThemeSwitcher themes={themes} />);
    fireEvent.click(screen.getByRole("button", { name: /change theme/i }));
    expect(screen.getByRole("option", { name: /cyberpunk/i })).toHaveAttribute("aria-selected", "true");
  });
});
