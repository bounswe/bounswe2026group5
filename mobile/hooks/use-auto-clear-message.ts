import { useEffect, type Dispatch, type SetStateAction } from "react";

const DEFAULT_CLEAR_DELAY_MS = 4_000;

export function useAutoClearMessage(
  message: string | null,
  setMessage: Dispatch<SetStateAction<string | null>>,
  delayMs: number = DEFAULT_CLEAR_DELAY_MS,
) {
  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeoutId = setTimeout(() => setMessage(null), delayMs);
    return () => clearTimeout(timeoutId);
  }, [delayMs, message, setMessage]);
}
