"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast";
import { Loader2, Mail, Lock, Eye, EyeOff, User, ExternalLink } from "lucide-react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  
  const { signUp } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';

  const validateForm = () => {
    if (!email || !password || !confirmPassword) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "error",
      });
      return false;
    }

    if (password.length < 8) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        variant: "error",
      });
      return false;
    }

    if (password !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمتا المرور غير متطابقتين",
        variant: "error",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال بريد إلكتروني صحيح",
        variant: "error",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const result = await signUp(email, password, name || undefined);

      if (result.success) {
        setEmailSent(true);
        // In development, show the verification token for easy testing
        if (isDevelopment && result.verificationToken) {
          setVerificationToken(result.verificationToken);
        }
        toast({
          title: "تم إنشاء الحساب",
          description: "يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب",
          variant: "success",
        });
      } else {
        toast({
          title: "خطأ في إنشاء الحساب",
          description: result.error || "حدث خطأ أثناء إنشاء الحساب",
          variant: "error",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
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
            <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            تم إرسال رابط التحقق
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            لقد أرسلنا رابط التحقق إلى بريدك الإلكتروني
            <br />
            <span className="font-medium text-gray-900 dark:text-white">{email}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            يرجى التحقق من بريدك الإلكتروني والنقر على الرابط لتفعيل حسابك
          </p>
          
          {/* Development mode: Show verification link directly */}
          {isDevelopment && verificationToken && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3 font-medium">
                ⚠️ وضع التطوير - لم يتم تكوين خدمة البريد الإلكتروني
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                انقر على الرابط أدناه للتحقق من بريدك الإلكتروني:
              </p>
              <Link
                href={`/verify-email?token=${verificationToken}`}
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium text-sm underline"
              >
                <ExternalLink className="h-4 w-4" />
                التحقق من البريد الإلكتروني
              </Link>
            </div>
          )}
          
          <Button
            variant="outline"
            onClick={() => router.push("/sign-in")}
            className="w-full"
          >
            العودة لتسجيل الدخول
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          إنشاء حساب جديد
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          أدخل بياناتك لإنشاء حساب جديد
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">الاسم (اختياري)</Label>
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="name"
              type="text"
              placeholder="أدخل اسمك"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pr-10"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">البريد الإلكتروني *</Label>
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
          <Label htmlFor="password">كلمة المرور *</Label>
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
          <p className="text-xs text-gray-500">
            يجب أن تكون 8 أحرف على الأقل
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">تأكيد كلمة المرور *</Label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pr-10 pl-10"
              required
              disabled={isLoading}
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري إنشاء الحساب...
            </>
          ) : (
            "إنشاء حساب"
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          لديك حساب بالفعل؟{" "}
          <Link
            href="/sign-in"
            className="text-blue-600 hover:text-blue-500 dark:text-blue-400 font-medium"
          >
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
