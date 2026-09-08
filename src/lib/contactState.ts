import type { ContactErrors } from "./contactValidation";

export type ContactState = {
  status: "idle" | "success" | "error";
  errors?: ContactErrors;
  formError?: string;
  values?: {
    name: string;
    email: string;
    budget: string;
    website: string;
    message: string;
  };
};

export const initialContactState: ContactState = { status: "idle" };
