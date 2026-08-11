"use server";

import { cookies } from "next/headers";

/**
 * Server Action: clears the auth_token cookie on the server.
 *
 * This is necessary because the cookie may have been set with attributes
 * (Secure, SameSite, Path) that make client-side deletion unreliable.
 * Running this on the server guarantees the cookie is removed.
 *
 * The client is responsible for the redirect after calling this action,
 * so we do NOT call redirect() here — that way the caller can do a
 * hard window.location.href redirect to fully unmount the React tree.
 */
export async function clearAuthCookieAction(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete("auth_token");

  // Also clear any related session cookies if they exist
  cookieStore.delete("session_token");
}
