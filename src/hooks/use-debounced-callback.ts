"use client";

import * as React from "react";

/** Returns a debounced version of `callback` that delays invocation by `delayMs`. */
export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delayMs: number
) {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = React.useRef(callback);
  callbackRef.current = callback;

  React.useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return React.useCallback(
    (...args: TArgs) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delayMs);
    },
    [delayMs]
  );
}
