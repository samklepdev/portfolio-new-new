import type { ContactErrors } from "./contactValidation";

/**
 * The contact form's action state.
 *
 * Lives here rather than beside the server action because a `"use server"`
 * module may only export async functions — exporting a plain object from it
 * throws at build/runtime ("A 'use server' file can only export async
 * functions"). Both the action and the client form import from here.
 */
export type ContactState = {
  status: "idle" | "success" | "error";
  errors?: ContactErrors;
  /** Only set when the whole submission failed, not for per-field problems. */
  formError?: string;
  /** Echoed back so a rejected form does not lose what the visitor typed. */
  values?: { name: string; email: string; message: string };
};

export const initialContactState: ContactState = { status: "idle" };
