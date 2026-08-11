"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-500 mb-2">
          حدث خطأ غير متوقع
        </h2>
        <p className="text-muted-foreground mb-4">
          نعتذر عن الإزعاج. يرجى المحاولة مرة أخرى.
        </p>
        {error.message && (
          <p className="text-sm text-muted-foreground mb-4">
            {error.message}
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Button
            onClick={() => reset()}
            variant="default"
          >
            حاول مرة أخرى
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            إعادة تحميل الصفحة
          </Button>
        </div>
      </div>
    </div>
  );
}
