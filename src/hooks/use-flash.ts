import { useCallback, useEffect, useRef, useState } from "react";

/** A short message that clears itself, e.g. why a drop was rejected. */
export function useFlash(ms = 3000) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number>();

  const flash = useCallback(
    (text: string) => {
      window.clearTimeout(timer.current);
      setMessage(text);
      timer.current = window.setTimeout(() => setMessage(null), ms);
    },
    [ms],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { message, flash };
}
