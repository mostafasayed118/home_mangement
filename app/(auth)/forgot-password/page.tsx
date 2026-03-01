"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast";
import { Loader2, Mail, ArrowRight, CheckCircle, ExternalLink } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const { requestPasswordReset } = useAuth();
  const { toast } = useToast();

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer votre adresse email",
        variant: "error",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une adresse email valide",
        variant: "error",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await requestPasswordReset(email);

      if (result.success) {
        setEmailSent(true);
        // In development, show the reset token for easy testing
        if (isDevelopment && result.resetToken) {
          setResetToken(result.resetToken);
        }
        toast({
          title: "Email envoyé",
          description: "Si un compte existe avec cette adresse, vous recevrez un email de réinitialisation",
          variant: "success",
        });
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Une erreur s'est produite",
          variant: "error",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Email Sent
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            If an account exists with the email
            <br />
            <span className="font-medium text-gray-900 dark:text-white">{email}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            You will receive a password reset link. Please check your inbox and spam folder.
          </p>

          {/* Development mode: Show reset link directly */}
          {isDevelopment && resetToken && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3 font-medium">
                Development Mode - Email service not configured
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                Click the link below to reset your password:
              </p>
              <Link
                href={`/reset-password?token=${resetToken}`}
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium text-sm underline"
              >
                <ExternalLink className="h-4 w-4" />
                Reset Password
              </Link>
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => {
                setEmailSent(false);
                setResetToken(null);
              }}
              className="w-full"
            >
              Send another email
            </Button>
            <Link href="/sign-in" className="block">
              <Button variant="ghost" className="w-full">
                <ArrowRight className="ml-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Forgot Password
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pr-10"
              required
              disabled={isLoading}
              dir="ltr"
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send Reset Link"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/sign-in"
          className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          <ArrowRight className="inline-block ml-1 h-4 w-4" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}