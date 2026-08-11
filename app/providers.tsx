"use client";

import { ReactNode, useCallback, useState, useEffect, useMemo } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { ToastProvider } from "@/lib/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { getCookie } from "@/lib/cookies";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Module-level token store.
 * Set synchronously in ConvexClientProvider before the first render
 * so that useMyCustomAuth can initialize its state correctly
 * without waiting for a useEffect.
 */
let _serverToken: string | null = null;

/**
 * Top-level custom auth hook for ConvexProviderWithAuth.
 *
 * Initialises isAuthenticated and the token synchronously from the
 * server-supplied _serverToken, so Convex never makes its first
 * network call without an auth header.
 */
export function useMyCustomAuth() {
  // Initialise synchronously with the server token — zero-delay!
  const [token, setToken] = useState<string | null>(
    () => _serverToken || (typeof window !== "undefined" ? localStorage.getItem("convex_token") || getCookie("auth_token") : null)
  );
  const [isLoading, setIsLoading] = useState(false); // no loading needed — token is already known

  // Keep token in sync after mount (handles login / logout events)
  useEffect(() => {
    const syncToken = () => {
      const current = localStorage.getItem("convex_token") || getCookie("auth_token") || null;
      setToken(current);
    };

    // If localStorage wasn't populated yet, copy the server token now
    if (_serverToken && !localStorage.getItem("convex_token")) {
      localStorage.setItem("convex_token", _serverToken);
    }

    // Sync on login / logout dispatched by AuthProvider
    const handleAuthChange = (e: Event) => {
      const ev = e as CustomEvent<{ token: string | null }>;
      setToken(ev.detail.token);
    };

    window.addEventListener("convex-auth-update", handleAuthChange);
    // Also sync between tabs
    window.addEventListener("storage", syncToken);

    return () => {
      window.removeEventListener("convex-auth-update", handleAuthChange);
      window.removeEventListener("storage", syncToken);
    };
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      return (
        token ||
        localStorage.getItem("convex_token") ||
        getCookie("auth_token") ||
        null
      );
    },
    [token]
  );

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated: !!token,
      fetchAccessToken,
    }),
    [isLoading, token, fetchAccessToken]
  );
}

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  // Synchronously set the module-level token BEFORE any child renders.
  // This is safe because ConvexClientProvider always renders before its children.
  if (initialToken) {
    _serverToken = initialToken;
    // Also hydrate localStorage on the server-render pass if possible
    if (typeof window !== "undefined" && !localStorage.getItem("convex_token")) {
      localStorage.setItem("convex_token", initialToken);
    }
  }

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useMyCustomAuth}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        forcedTheme="dark"
        disableTransitionOnChange
      >
        <AuthProvider initialToken={initialToken}>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ConvexProviderWithAuth>
  );
}
