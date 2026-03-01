"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast";
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react";

function VerifyEmailForm() {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  
  const { verifyEmail, resendVerification } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setError("No verification token provided");
      return;
    }

    // Auto-verify when token is available
    const verify = async () => {
      try {
        const result = await verifyEmail(token);

        if (result.success) {
          setIsSuccess(true);
          toast({
            title: "تم تفعيل الحساب بنجاح",
            description: "تم التحقق من بريدك الإلكتروني بنجاح",
            variant: "success",
          });
          
          // Redirect to sign-in after 2 seconds so user can log in
          setTimeout(() => {
            window.location.href = "/sign-in";
          }, 2000);
        } else {
          setError(result.error || "Failed to verify email");
        }
      } catch (err) {
        setError("An unexpected error occurred");
      } finally {
        setIsVerifying(false);
      }
    };

    if (token) {
      verify();
    }
  }, [token, verifyEmail, router, toast]);

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "error",
      });
      return;
    }

    setIsResending(true);

    try {
      const result = await resendVerification(email);

      if (result.success) {
        setResendSuccess(true);
        toast({
          title: "Email Sent",
          description: "A new verification link has been sent to your email",
          variant: "success",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to send verification email",
          variant: "error",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "error",
      });
    } finally {
      setIsResending(false);
    }
  };

  // No token provided
  if (!token) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
            <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid Link
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            No verification token was provided. Please check your email for the correct link.
          </p>
          <Link href="/sign-in">
            <Button className="w-full">
              Go to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (isVerifying) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            Verifying Your Email
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Please wait while we verify your email address...
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Email Verified!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your email has been successfully verified. You will be redirected to the dashboard shortly.
          </p>
          <Link href="/">
            <Button className="w-full">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Resend success state
  if (resendSuccess) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Verification Email Sent
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            A new verification link has been sent to <span className="font-medium">{email}</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Please check your inbox and click the link to verify your email.
          </p>
          <Link href="/sign-in">
            <Button variant="outline" className="w-full">
              Go to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Error state with resend option
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
          <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Verification Failed
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error || "The verification link is invalid or has expired."}
        </p>
        
        {/* Resend verification form */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Need a new verification link? Enter your email below:
          </p>
          <form onSubmit={handleResendVerification} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="sr-only">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isResending}
                dir="ltr"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isResending}>
              {isResending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send New Verification Link"
              )}
            </Button>
          </form>
        </div>
        
        <Link href="/sign-in">
          <Button variant="outline" className="w-full">
            Go to Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Loading...
            </p>
          </div>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
