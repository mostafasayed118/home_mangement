"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  
  const { signIn, resendVerification } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const redirect = searchParams.get("redirect") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setNeedsVerification(false);

    try {
      const result = await signIn(email, password);

      if (result.success) {
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: "مرحباً بك مرة أخرى",
          variant: "success",
        });
        // Delay redirect to ensure cookie is fully registered by the browser
        // Then use window.location.assign to force a fresh server request
        await new Promise(res => setTimeout(res, 500));
        window.location.assign("/");
      } else if (result.needsVerification) {
        setNeedsVerification(true);
        toast({
          title: "البريد الإلكتروني غير موثق",
          description: "يرجى التحقق من بريدك الإلكتروني أولاً",
          variant: "warning",
        });
      } else {
        toast({
          title: "خطأ في تسجيل الدخول",
          description: result.error || "بيانات الدخول غير صحيحة",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      const result = await resendVerification(email);
      if (result.success) {
        toast({
          title: "تم إرسال رابط التحقق",
          description: "يرجى التحقق من بريدك الإلكتروني",
          variant: "success",
        });
      } else {
        toast({
          title: "خطأ",
          description: result.error || "فشل في إرسال رابط التحقق",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          تسجيل الدخول
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          أدخل بياناتك للوصول إلى لوحة التحكم
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">البريد الإلكتروني</Label>
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

        <div className="space-y-2">
          <Label htmlFor="password">كلمة المرور</Label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10 pl-10"
              required
              disabled={isLoading}
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            نسيت كلمة المرور؟
          </Link>
        </div>

        {needsVerification && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              لم يتم التحقق من بريدك الإلكتروني بعد
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResendVerification}
              disabled={isLoading}
            >
              إعادة إرسال رابط التحقق
            </Button>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري تسجيل الدخول...
            </>
          ) : (
            "تسجيل الدخول"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ليس لديك حساب؟{" "}
          <Link
            href="/sign-up"
            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium"
          >
            إنشاء حساب جديد
          </Link>
        </p>
      </div>
    </div>
  );
}
