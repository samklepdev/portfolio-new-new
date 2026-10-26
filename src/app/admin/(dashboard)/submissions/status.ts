import type { SubmissionRowDTO } from "@/services/types";

export type DeliveryStatus = "delivered" | "failed" | "pending";

// Error wins over a delivery timestamp: a row that recorded an error is "failed"
// even if an earlier attempt stamped emailedAt. Mirrors the dashboard's logic.
export function deliveryStatus(
  s: Pick<SubmissionRowDTO, "emailedAt" | "emailError">,
): DeliveryStatus {
  if (s.emailError) return "failed";
  if (s.emailedAt) return "delivered";
  return "pending";
}
