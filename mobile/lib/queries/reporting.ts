import { useMutation } from "@tanstack/react-query";

import { apiPost } from "@/lib/api/client";

export type ReportReason =
  | "SPAM"
  | "HARASSMENT"
  | "INAPPROPRIATE_CONTENT"
  | "OTHER";

export type SubmitReportPayload = {
  reported_user_id?: string;
  reported_username?: string;
  related_message_id?: string;
  reason: ReportReason;
  description?: string;
};

export type ReportResponse = {
  id: string;
  status: string;
};

export function useSubmitReportMutation() {
  return useMutation({
    mutationFn: (payload: SubmitReportPayload) =>
      apiPost<ReportResponse, SubmitReportPayload>("/api/auth/reports/", {
        ...payload,
        description: payload.description?.trim() ?? "",
      }),
  });
}
