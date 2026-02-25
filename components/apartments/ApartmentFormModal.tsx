"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
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
import { useToast } from "@/lib/toast";

interface ApartmentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apartment?: {
    _id: Id<"apartments">;
    floor: number;
    unitNumber: string;
    unitLabel: string;
    status: "occupied" | "vacant" | "maintenance";
    rentAmount: number;
  } | null;
}

export function ApartmentFormModal({
  open,
  onOpenChange,
  apartment,
}: ApartmentFormModalProps) {
  const addApartment = useMutation(api.apartments.addApartment);
  const updateApartment = useMutation(api.apartments.updateApartment);
  const { addToast } = useToast();

  const [floor, setFloor] = useState(apartment?.floor ?? 1);
  const [unitNumber, setUnitNumber] = useState(apartment?.unitNumber ?? "");
  const [status, setStatus] = useState<
    "occupied" | "vacant" | "maintenance"
  >(apartment?.status ?? "vacant");
  const [rentAmount, setRentAmount] = useState(apartment?.rentAmount ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!apartment;

  // Reset form when modal opens/closes or apartment changes
  useEffect(() => {
    if (open) {
      setFloor(apartment?.floor ?? 1);
      setUnitNumber(apartment?.unitNumber ?? "");
      setStatus(apartment?.status ?? "vacant");
      setRentAmount(apartment?.rentAmount ?? 0);
      setError(null);
    }
  }, [open, apartment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validate rent amount - must be strictly greater than 0
      if (rentAmount <= 0) {
        setError("يجب أن يكون الإيجار الشهري أكبر من صفر");
        setIsSubmitting(false);
        return;
      }

      const unitLabel = `${floor}-${unitNumber}`;

      if (isEdit) {
        await updateApartment({
          id: apartment._id,
          floor,
          unitNumber,
          unitLabel,
          status,
          rentAmount,
        });
        addToast("تم تحديث الشقة بنجاح", "success");
      } else {
        await addApartment({
          floor,
          unitNumber,
          unitLabel,
          status,
          rentAmount,
        });
        addToast("تم إضافة الشقة بنجاح", "success");
      }

      onOpenChange(false);
      // Reset form
      setFloor(1);
      setUnitNumber("");
      setStatus("vacant");
      setRentAmount(0);
      setError(null);
    } catch (error) {
      console.error("Error saving apartment:", error);
      setError("حدث خطأ أثناء حفظ الشقة");
      addToast("حدث خطأ أثناء حفظ الشقة", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "تعديل شقة" : "إضافة شقة جديدة"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "قم بتعديل بيانات الشقة أدناه"
              : "أضف شقة جديدة إلى المبنى"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="floor" className="text-start">
                الدور
              </Label>
              <Input
                id="floor"
                type="number"
                min={1}
                max={50}
                value={floor}
                onChange={(e) => setFloor(parseInt(e.target.value) || 1)}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="unitNumber" className="text-start">
                رقم الوحدة
              </Label>
              <Input
                id="unitNumber"
                type="text"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                className="col-span-3"
                placeholder="مثال: A"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-start">
                الحالة
              </Label>
              <Select
                value={status}
                onValueChange={(value: "occupied" | "vacant" | "maintenance") =>
                  setStatus(value)
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacant">شاغرة</SelectItem>
                  <SelectItem value="occupied">مؤجرة</SelectItem>
                  <SelectItem value="maintenance">صيانة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rentAmount" className="text-start">
                الإيجار الشهري
              </Label>
              <Input
                id="rentAmount"
                type="number"
                min={1}
                value={rentAmount}
                onChange={(e) => setRentAmount(parseFloat(e.target.value) || 0)}
                className="col-span-3"
                placeholder="مثال: 5000"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "جاري الحفظ..." : isEdit ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
