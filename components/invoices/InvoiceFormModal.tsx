"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, X, FileImage, Loader2 } from "lucide-react";
import { useToast } from "@/lib/toast";

interface InvoiceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: {
    _id: Id<"invoices">;
    apartmentId: Id<"apartments">;
    amount: number;
    type: string;
    date: number;
    status: "paid" | "pending";
    receiptImageId?: Id<"_storage">;
    receiptImageUrl?: string | null;
    description?: string;
  } | null;
  preselectedApartmentId?: Id<"apartments"> | null;
}

interface Apartment {
  _id: Id<"apartments">;
  unitLabel: string;
}

const INVOICE_TYPES = [
  { value: "electricity", label: "كهرباء" },
  { value: "water", label: "مياه" },
  { value: "gas", label: "غاز" },
  { value: "maintenance", label: "صيانة" },
  { value: "internet", label: "إنترنت" },
  { value: "other", label: "أخرى" },
];

export function InvoiceFormModal({
  open,
  onOpenChange,
  invoice,
  preselectedApartmentId,
}: InvoiceFormModalProps) {
  const apartments = useQuery(api.apartments.getAll);
  const generateUploadUrl = useMutation(api.invoices.generateUploadUrl);
  const createInvoice = useMutation(api.invoices.createInvoice);
  const updateInvoice = useMutation(api.invoices.updateInvoice);
  const { addToast } = useToast();

  // Note: apartmentId is stored as string for Select component compatibility,
  // but is cast to Id<"apartments"> when submitting to the backend
  const [apartmentId, setApartmentId] = useState<string>("");
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<"paid" | "pending">("pending");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isExistingImage, setIsExistingImage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!invoice;

  useEffect(() => {
    if (invoice) {
      // Convert Id<"apartments"> to string for Select component
      setApartmentId(invoice.apartmentId as unknown as string);
      setAmount(invoice.amount);
      setType(invoice.type);
      setDate(new Date(invoice.date).toISOString().split("T")[0]);
      setStatus(invoice.status);
      setDescription(invoice.description || "");
      setSelectedFile(null);
      // Show existing receipt image if available
      const hasExistingImage = !!invoice.receiptImageUrl;
      setPreviewUrl(invoice.receiptImageUrl || null);
      setIsExistingImage(hasExistingImage);
    } else {
      // Reset form for new invoice
      setApartmentId(preselectedApartmentId ? (preselectedApartmentId as unknown as string) : "");
      setAmount(0);
      setType("");
      setDate(new Date().toISOString().split("T")[0]);
      setStatus("pending");
      setDescription("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsExistingImage(false);
    }
    setError(null);
  }, [invoice, open, preselectedApartmentId]);

  // Clean up preview URL on unmount (only for locally created URLs)
  useEffect(() => {
    return () => {
      // Only revoke URLs that were created locally via URL.createObjectURL
      if (previewUrl && !isExistingImage) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, isExistingImage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("يرجى اختيار ملف صورة صالح");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("حجم الملف يجب أن يكون أقل من 5 ميجابايت");
        return;
      }
      
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsExistingImage(false);
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    // Only revoke URL if it was created locally
    if (previewUrl && !isExistingImage) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsExistingImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (file: File): Promise<Id<"_storage">> => {
    // Step 1: Get the upload URL
    const uploadUrl = await generateUploadUrl();
    
    // Step 2: POST the file to the upload URL
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });
    
    // Step 3: Parse response and check for errors
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("فشل في قراءة استجابة الخادم");
    }
    
    if (!response.ok) {
      throw new Error(result?.error || "فشل في رفع الملف");
    }
    
    // Step 4: Get the storage ID from the response
    if (!result.storageId) {
      throw new Error("لم يتم استلام معرف الملف من الخادم");
    }
    return result.storageId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate required fields
      if (!apartmentId) {
        setError("يرجى اختيار الشقة");
        setIsLoading(false);
        return;
      }

      if (!type) {
        setError("يرجى اختيار نوع الفاتورة");
        setIsLoading(false);
        return;
      }

      if (amount <= 0) {
        setError("يجب أن يكون المبلغ أكبر من صفر");
        setIsLoading(false);
        return;
      }

      let storageId: Id<"_storage"> | undefined = undefined;

      // Upload file if selected (only for new invoices or if new file selected)
      if (selectedFile) {
        setIsUploading(true);
        try {
          storageId = await uploadFile(selectedFile);
        } catch (uploadError) {
          console.error("Error uploading file:", uploadError);
          setError("فشل في رفع الصورة. يرجى المحاولة مرة أخرى.");
          setIsLoading(false);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      const invoiceData = {
        apartmentId: apartmentId as Id<"apartments">,
        amount,
        type,
        date: new Date(date).getTime(),
        status,
        description: description || undefined,
        receiptImageId: storageId,
      };

      if (isEdit) {
        // For edit, only update image if new one was uploaded
        await updateInvoice({
          id: invoice._id,
          ...invoiceData,
          receiptImageId: storageId || invoice.receiptImageId,
        });
        addToast("تم تحديث الفاتورة بنجاح", "success");
      } else {
        await createInvoice(invoiceData);
        addToast("تم إضافة الفاتورة بنجاح", "success");
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving invoice:", error);
      setError("حدث خطأ أثناء حفظ الفاتورة");
      addToast("حدث خطأ أثناء حفظ الفاتورة", "error");
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "تعديل فاتورة" : "إضافة فاتورة جديدة"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "قم بتعديل بيانات الفاتورة أدناه"
              : "أضف فاتورة جديدة مع إمكانية رفع صورة الإيصال"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Apartment Selection */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apartment" className="text-start">
                الشقة <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={apartmentId} 
                onValueChange={setApartmentId}
                disabled={!!preselectedApartmentId}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="اختر الشقة" />
                </SelectTrigger>
                <SelectContent>
                  {apartments?.map((apt: Apartment) => (
                    <SelectItem key={apt._id} value={apt._id}>
                      {apt.unitLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Invoice Type */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-start">
                النوع <span className="text-red-500">*</span>
              </Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="اختر نوع الفاتورة" />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-start">
                المبلغ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="col-span-3"
                placeholder="مثال: 500"
                required
              />
            </div>

            {/* Date */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-start">
                التاريخ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="col-span-3"
                required
              />
            </div>

            {/* Status */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-start">
                الحالة
              </Label>
              <Select
                value={status}
                onValueChange={(v: "paid" | "pending") => setStatus(v)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">معلقة</SelectItem>
                  <SelectItem value="paid">مدفوعة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-start">
                الوصف
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                placeholder="وصف تفصيلي (اختياري)"
              />
            </div>

            {/* Receipt Image Upload */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-start pt-2">
                صورة الإيصال
              </Label>
              <div className="col-span-3 space-y-3">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {/* Preview or upload button */}
                {previewUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={previewUrl}
                      alt="معاينة الإيصال"
                      className="max-h-40 rounded-md border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-dashed border-2 hover:border-primary hover:bg-gray-50"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-6 w-6 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        اضغط لرفع صورة الإيصال
                      </span>
                      <span className="text-xs text-gray-400">
                        (PNG, JPG - حتى 5MB)
                      </span>
                    </div>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الرفع...
                </>
              ) : isLoading ? (
                "جاري الحفظ..."
              ) : isEdit ? (
                "تحديث"
              ) : (
                "إضافة"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
