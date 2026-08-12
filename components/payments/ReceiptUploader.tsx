"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Loader2 } from "lucide-react";

interface ReceiptUploaderProps {
  onUploadComplete: (storageId: string) => void;
  initialValue?: string;
  disabled?: boolean;
}

export function ReceiptUploader({
  onUploadComplete,
  initialValue,
  disabled = false,
}: ReceiptUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialValue || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.payments.generateUploadUrl);
  const getReceiptUrl = useMutation(api.payments.getReceiptUrl);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("يرجى اختيار صورة");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Get the upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload the file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("فشل رفع الصورة");
      }

      // Parse the response to get the storage ID
      const { storageId } = await result.json();

      // Get the permanent URL for the uploaded file
      const url = await getReceiptUrl({ storageId });

      if (url) {
        setPreviewUrl(url);
        onUploadComplete(storageId);
      } else {
        throw new Error("فشل الحصول على رابط الصورة");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء رفع الصورة");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onUploadComplete("");
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        صورة إيصال الدفع
      </label>

      {previewUrl ? (
        <div className="relative border rounded-md overflow-hidden w-full max-w-[200px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Receipt"
            className="w-full h-auto object-cover"
          />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 left-1 h-6 w-6"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
            className="max-w-[250px]"
          />
          {isUploading && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {!previewUrl && !isUploading && !error && (
        <p className="text-xs text-muted-foreground">
         _supported formats: JPG, PNG, GIF (max 5MB)_
        </p>
      )}
    </div>
  );
}
