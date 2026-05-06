import { useEffect } from "react";

import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useToast } from "@/components/ui/ToastProvider";

interface SuccessCardProps {
  message: string;
  title?: string;
  presentation?: "inline" | "toast";
  durationMs?: number;
}

export function SuccessCard({
  message,
  title = "Success",
  presentation = "inline",
  durationMs,
}: Readonly<SuccessCardProps>) {
  const toast = useToast();

  useEffect(() => {
    if (presentation !== "toast") {
      return;
    }

    toast.success(message, { title, durationMs });
  }, [durationMs, message, presentation, title, toast]);

  if (presentation === "toast") {
    return null;
  }

  return <ErrorBanner message={message} title={title} variant="success" />;
}
