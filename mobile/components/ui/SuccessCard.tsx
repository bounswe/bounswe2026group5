import { ErrorBanner } from "@/components/ui/ErrorBanner";

interface SuccessCardProps {
  message: string;
  title?: string;
}

export function SuccessCard({
  message,
  title = "Success",
}: Readonly<SuccessCardProps>) {
  return <ErrorBanner message={message} title={title} variant="success" />;
}
