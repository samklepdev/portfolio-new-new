"use client";

import { useState } from "react";
import type { ThemeInput, ThemeRowDTO } from "@/services/types";
import styles from "./editor.module.css";
import fieldStyles from "./FormFields.module.css";
import themeStyles from "./themes/themes.module.css";

const SLOTS: { key: keyof Omit<ThemeInput, "name">; label: string; fallback: string }[] = [
  { key: "background", label: "Background", fallback: "#0b0e14" },
  { key: "foreground", label: "Foreground", fallback: "#ffffff" },
  { key: "turquoise", label: "Turquoise", fallback: "#00f0ff" },
  { key: "pink", label: "Pink", fallback: "#ff2e97" },
  { key: "purple", label: "Purple", fallback: "#b026ff" },
  { key: "green", label: "Green", fallback: "#39ff88" },
];

export default function ThemeForm({
  initial,
  submitLabel,
  onSubmit,
  submitting,
}: {
  initial?: ThemeRowDTO;
  submitLabel: string;
  onSubmit: (input: ThemeInput) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [colors, setColors] = useState<Record<string, string>>(() =>
    Object.fromEntries(SLOTS.map((s) => [s.key, initial?.[s.key] ?? s.fallback])),
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({
      name,
      background: colors.background,
      foreground: colors.foreground,
      turquoise: colors.turquoise,
      pink: colors.pink,
      purple: colors.purple,
      green: colors.green,
    });
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={fieldStyles.field}>
        <span className={fieldStyles.label}>Name</span>
        <input
          className={fieldStyles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <div className={themeStyles.slots}>
        {SLOTS.map((slot) => (
          <div key={slot.key} className={themeStyles.slot}>
            <label htmlFor={`color-${slot.key}`}>{slot.label}</label>
            <div className={themeStyles.slotInputs}>
              <input
                id={`color-${slot.key}`}
                type="color"
                aria-label={slot.label}
                value={colors[slot.key]}
                onChange={(e) => setColors((c) => ({ ...c, [slot.key]: e.target.value }))}
              />
              <input
                type="text"
                aria-label={`${slot.label} hex`}
                className={fieldStyles.input}
                value={colors[slot.key]}
                onChange={(e) => setColors((c) => ({ ...c, [slot.key]: e.target.value }))}
              />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={submitting}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
