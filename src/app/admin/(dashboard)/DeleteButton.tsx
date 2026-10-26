"use client";

import { useState } from "react";
import styles from "./DeleteButton.module.css";

export default function DeleteButton({
  onConfirm,
  label = "Delete",
  confirmLabel = "Confirm?",
}: {
  onConfirm: () => Promise<void>;
  label?: string;
  confirmLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
      setArmed(false);
    }
  }

  return (
    <button
      type="button"
      className={armed ? styles.armed : styles.button}
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? "Deleting…" : armed ? confirmLabel : label}
    </button>
  );
}
