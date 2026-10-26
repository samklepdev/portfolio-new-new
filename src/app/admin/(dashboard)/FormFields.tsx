"use client";

import styles from "./FormFields.module.css";

export function TextField({
  id, label, value, onChange, type = "text", required = false,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input id={id} className={styles.input} type={type} value={value} required={required}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function TextAreaField({
  id, label, value, onChange, mono = false,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; mono?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <textarea id={id} className={mono ? styles.mono : styles.input} value={value} rows={mono ? 16 : 4}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function CheckboxField({
  id, label, checked, onChange,
}: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className={styles.checkRow}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export function NumberField({
  id, label, value, onChange,
}: {
  id: string; label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input id={id} className={styles.input} type="number" value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function SelectField({
  id, label, value, onChange, options,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <select id={id} className={styles.input} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </div>
  );
}

export function DateField({
  id, label, value, onChange,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input id={id} className={styles.input} type="date" value={value}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
