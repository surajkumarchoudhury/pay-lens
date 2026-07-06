import { useEffect, useRef, type DependencyList, type EffectCallback } from "react";

/**
 * Like `useEffect`, but skips the initial mount — the effect only runs on
 * subsequent dependency changes. Useful for reacting to state changes without
 * firing on first render (e.g. persisting a value only after the user edits it,
 * not when it's first seeded from the server).
 *
 * Cleanup is supported: whatever the effect returns is used as the teardown,
 * exactly as in `useEffect`.
 */
export function useUpdateEffect(effect: EffectCallback, deps: DependencyList = []) {
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    return effect();
    // Caller-supplied `deps` are the real dependency list; the linter can't
    // statically verify a forwarded array, and `effect` is intentionally omitted
    // (re-created each render, like the callback passed to useEffect).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
