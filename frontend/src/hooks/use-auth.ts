"use client";

import { useSyncExternalStore } from "react";

function readAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith("auth_present="));
}

function subscribe(): () => void {
  return () => {};
}

export function useAuth(): { authenticated: boolean } {
  const authenticated = useSyncExternalStore(
    subscribe,
    readAuthCookie,
    () => false,
  );
  return { authenticated };
}
