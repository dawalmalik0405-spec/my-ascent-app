import { useEffect, useRef, useState } from "react";

/**
 * Reveals text progressively when the API target string updates (polling),
 * so conclusions feel streamed instead of popping in all at once.
 */
export function useStreamingText(fullText: string | undefined | null, resetKey: string) {
  const [displayed, setDisplayed] = useState("");
  const targetRef = useRef("");
  const resetKeyRef = useRef(resetKey);

  useEffect(() => {
    const target = fullText ?? "";
    targetRef.current = target;

    if (resetKeyRef.current !== resetKey) {
      resetKeyRef.current = resetKey;
      setDisplayed("");
    }

    if (!target) {
      setDisplayed("");
      return;
    }

    const tick = () => {
      setDisplayed((d) => {
        const t = targetRef.current;
        if (!t) return "";
        if (d.length >= t.length) return t;
        const behind = t.length - d.length;
        const step = Math.max(1, Math.min(48, Math.ceil(behind / 12)));
        return t.slice(0, d.length + step);
      });
    };

    const id = window.setInterval(tick, 28);
    return () => window.clearInterval(id);
  }, [fullText, resetKey]);

  return displayed;
}
