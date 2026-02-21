"use client";

import { useState, useEffect } from "react";
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

interface PaymentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: {
    _id: Id<"payments">;
    tenantId: Id<"tenants">;
    apartmentId: Id<"apartments">;
    amount: number;
    dueDate: number;
    paymentDate: number;
    status: "paid" | "pending" | "late" | "partial";
    notes?: string;
    month: number;
    year: number;
  } | null;
}

interface Tenant {
  _id: Id<"tenants">;
  name: string;
  apartmentId: Id<"apartments">;
  apartment?: {
    unitLabel: string;
    rentAmount: number;
  } | null;
}

export function PaymentFormModal({
  open,
  onOpenChange,
  payment,
}: PaymentFormModalProps) {
  const tenants = useQuery(api.tenants.getActive);
  const apartments = useQuery(api.apartments.getAll);
  const addPayment = useMutation(api.payments.addPayment);
  const updatePayment = useMutation(api.payments.updatePayment);

  const [tenantId, setTenantId] = useState<string>("");
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [status, setStatus] = useState<"paid" | "pending" | "late" | "partial">("pending");
  const [notes, setNotes] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!payment;

  // Get selected tenant's apartment info
  const selectedTenant = tenants?.find((t: Tenant) => t._id === tenantId);
  const tenantApartment = apartments?.find(a => a._id === selectedTenant?.apartmentId);

  useEffect(() => {
    if (payment) {
      setTenantId(payment.tenantId);
      setAmount(payment.amount);
      setDueDate(new Date(payment.dueDate).toISOString().split("T")[0]);
      // FIX: Use empty string instead of 0 for null paymentDate
      setPaymentDate(payment.paymentDate ? new Date(payment.paymentDate).toISOString().split("T")[0] : "");
      setStatus(payment.status);
      setNotes(payment.notes || "");
      setMonth(payment.month);
      setYear(payment.year);
    } else {
      // Reset form for new payment
      setTenantId("");
      setAmount(0);
      setDueDate("");
      setPaymentDate("");
      setStatus("pending");
      setNotes("");
      setMonth(new Date().getMonth() + 1);
      setYear(new Date().getFullYear());
    }
    setError(null);
  }, [payment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const currentTenant = tenants?.find((t: Tenant) => t._id === tenantId);
      
      if (!currentTenant) {
        setError("الرجاء اختيار المستأجر");
        setIsLoading(false);
        return;
      }

      // Validate amount - must be strictly greater than 0
      if (amount <= 0) {
        setError("يجب أن يكون المبلغ أكبر من صفر");
        setIsLoading(false);
        return;
      }

      // For partial payments, validate that amount is less than full rent
      if (status === "partial" && tenantApartment) {
        if (amount >= tenantApartment.rentAmount) {
          setError(`الدفع الجزئي يجب أن يكون أقل من الإيجار الشهري (${tenantApartment.rentAmount} ج.م)`);
          setIsLoading(false);
          return;
        }
      }

      // FIX: Use undefined instead of 0 for null paymentDate
      const paymentDateValue = paymentDate ? new Date(paymentDate).getTime() : undefined;

      if (isEdit) {
        await updatePayment({
          id: payment._id,
          amount,
          dueDate: new Date(dueDate).getTime(),
          paymentDate: paymentDateValue,
          status,
          notes: notes || undefined,
          month,
          year,
        });
      } else {
        await addPayment({
          tenantId: tenantId as Id<"tenants">,
          apartmentId: currentTenant.apartmentId,
          amount,
          dueDate: new Date(dueDate).getTime(),
          paymentDate: paymentDateValue || 0,
          status,
          notes: notes || undefined,
          month,
          year,
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving payment:", error);
      setError("حدث خطأ أثناء حفظ الدفعة");
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions = [
    { value: "pending", label: "معلق" },
    { value: "paid", label: "مدفوع" },
    { value: "late", label: "متأخر" },
    { value: "partial", label: "جزئي" },
  ];

  const months = [
    { value: 1, label: "يناير" },
    { value: 2, label: "فبراير" },
    { value: 3, label: "مارس" },
    { value: 4, label: "أبريل" },
    { value: 5, label: "مايو" },
    { value: 6, label: "يونيو" },
    { value: 7, label: "يوليو" },
    { value: 8, label: "أغسطس" },
    { value: 9, label: "سبتمبر" },
    { value: 10, label: "أكتوبر" },
    { value: 11, label: "نوفمبر" },
    { value: 12, label: "ديسمبر" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "تعديل دفعة" : "إضافة دفعة جديدة"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "قم بتعديل بيانات الدفعة أدناه"
              : "أضف دفعة جديدة للمستأجر"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            {!isEdit && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tenant" className="text-start">
                  المستأجر
                </Label>
                <Select value={tenantId} onValueChange={setTenantId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="اختر المستأجر" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants?.map((tenant: Tenant) => (
                      <SelectItem key={tenant._id} value={tenant._id}>
                        {tenant.name} - {(tenant as any).apartment?.unitLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="month" className="text-start">
                الشهر
              </Label>
              <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="اختر الشهر" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="year" className="text-start">
                السنة
              </Label>
              <Input
                id="year"
                type="number"
                min={2020}
                max={2050}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-start">
                المبلغ
              </Label>
              <Input
                id="amount"
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="col-span-3"
                placeholder="مثال: 5000"
                required
              />
            </div>

            {tenantApartment && status === "partial" && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-md text-sm col-span-4">
                الإيجار الشهري الكامل: {tenantApartment.rentAmount} ج.م
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDate" className="text-start">
                تاريخ الاستحقاق
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-start">
                الحالة
              </Label>
              <Select
                value={status}
                onValueChange={(v: "paid" | "pending" | "late" | "partial") => setStatus(v)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(status === "paid" || status === "partial") && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentDate" className="text-start">
                  تاريخ الدفع
                </Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="col-span-3"
                />
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-start">
                ملاحظات
              </Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-3"
                placeholder="ملاحظات اختيارية"
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "جاري الحفظ..." : isEdit ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
