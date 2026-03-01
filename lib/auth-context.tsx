"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { setCookie, deleteCookie, getCookie } from "./cookies";

// Simple SHA-256 hash function using Web Crypto API for client-side password hashing
// This adds an extra layer of security by not sending plaintext passwords over the network
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface User {
  _id: Id<"users">;
  email: string;
  name?: string;
  role: "admin";
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string; verificationToken?: string }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; resetToken?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get session from token
  const session = useQuery(
    api.auth.getSession,
    token ? { token } : "skip"
  );

  // Mutations
  const signUpMutation = useMutation(api.auth.signUp);
  const signOutMutation = useMutation(api.auth.signOut);
  const requestPasswordResetMutation = useMutation(api.auth.requestPasswordReset);
  const resetPasswordMutation = useMutation(api.auth.resetPassword);
  const verifyEmailMutation = useMutation(api.auth.verifyEmailToken);
  const resendVerificationMutation = useMutation(api.auth.resendVerificationEmail);

  // Initialize token from cookie on mount
  useEffect(() => {
    const savedToken = getCookie("auth_token");
    if (savedToken) {
      setToken(savedToken);
    }
    setIsLoading(false);
  }, []);

  // Update token state when session changes
  useEffect(() => {
    if (session === null && token) {
      // Session expired or invalid
      deleteCookie("auth_token");
      setToken(null);
    }
  }, [session, token]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      // Send plain password to server (over HTTPS - standard secure practice)
      // Server uses bcrypt.compare() for secure verification
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        if (result.needsVerification) {
          return { success: false, error: "Email not verified", needsVerification: true };
        }
        return { success: false, error: result.error || "Invalid email or password" };
      }
      
      if (result.token) {
        setCookie("auth_token", result.token, 7); // 7 days
        setToken(result.token);
        return { success: true };
      }
      
      return { success: false, error: "Failed to sign in" };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      return { success: false, error: errorMessage };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    try {
      // Send plain password to server (hashed server-side in Convex)
      // Using HTTPS transport provides security; server-side hashing is standard practice
      const result = await signUpMutation({ email, password, name });
      
      // Send verification email (non-blocking)
      if (result.verificationToken) {
        // Try to send email, but don't wait for it
        fetch("/api/auth/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "verification",
            email: result.email,
            token: result.verificationToken,
          }),
        }).catch((error) => {
          // Log but don't fail - email service might not be configured
          console.warn("Email sending failed (check RESEND_API_KEY):", error.message);
        });
        
        // In development, log the verification link
        if (process.env.NODE_ENV === 'development') {
          console.log(`%c📧 Verification Link: ${window.location.origin}/verify-email?token=${result.verificationToken}`, 'color: blue; font-weight: bold');
        }
      }
      
      return { success: true, verificationToken: result.verificationToken };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      return { success: false, error: errorMessage };
    }
  }, [signUpMutation]);

  const signOut = useCallback(async () => {
    if (token) {
      try {
        await signOutMutation({ token });
      } catch (error) {
        console.error("Error signing out:", error);
      }
    }
    
    deleteCookie("auth_token");
    setToken(null);
  }, [token, signOutMutation]);

  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      const result = await requestPasswordResetMutation({ email });
      
      // Send password reset email if user exists (non-blocking)
      if (result.resetToken) {
        fetch("/api/auth/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "password-reset",
            email: result.email,
            token: result.resetToken,
          }),
        }).catch((error) => {
          console.warn("Email sending failed:", error.message);
        });
        
        // In development, log the reset link
        if (process.env.NODE_ENV === 'development') {
          console.log(`%c📧 Reset Link: ${window.location.origin}/reset-password?token=${result.resetToken}`, 'color: blue; font-weight: bold');
        }
      }
      
      return { success: true, resetToken: result.resetToken || undefined };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      return { success: false, error: errorMessage };
    }
  }, [requestPasswordResetMutation]);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    try {
      // Send plain password to server (hashed server-side in Convex)
      await resetPasswordMutation({ token, newPassword });
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      return { success: false, error: errorMessage };
    }
  }, [resetPasswordMutation]);

  const verifyEmail = useCallback(async (token: string) => {
    try {
      const result = await verifyEmailMutation({ token });
      
      if (result.token) {
        setCookie("auth_token", result.token, 7); // 7 days
        setToken(result.token);
      }
      
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      return { success: false, error: errorMessage };
    }
  }, [verifyEmailMutation]);

  const resendVerification = useCallback(async (email: string) => {
    try {
      const result = await resendVerificationMutation({ email });
      
      // Send verification email (non-blocking)
      if (result.verificationToken) {
        fetch("/api/auth/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "verification",
            email: result.email,
            token: result.verificationToken,
          }),
        }).catch((error) => {
          console.warn("Email sending failed:", error.message);
        });
        
        // In development, log the verification link
        if (process.env.NODE_ENV === 'development') {
          console.log(`%c📧 Verification Link: ${window.location.origin}/verify-email?token=${result.verificationToken}`, 'color: blue; font-weight: bold');
        }
      }
      
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      return { success: false, error: errorMessage };
    }
  }, [resendVerificationMutation]);

  const value: AuthContextType = {
    user: session?.user || null,
    isLoading,
    isAuthenticated: !!session?.user,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    resetPassword,
    verifyEmail,
    resendVerification,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}