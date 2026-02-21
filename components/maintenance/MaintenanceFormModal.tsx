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

interface MaintenanceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenance?: {
    _id: Id<"maintenance">;
    apartmentId?: Id<"apartments">;
    title: string;
    cost: number;
    date: number;
    status: "pending" | "in_progress" | "done";
    description?: string;
  } | null;
}

interface Apartment {
  _id: Id<"apartments">;
  unitLabel: string;
}

export function MaintenanceFormModal({
  open,
  onOpenChange,
  maintenance,
}: MaintenanceFormModalProps) {
  const apartments = useQuery(api.apartments.getAll);
  const addMaintenance = useMutation(api.maintenance.addMaintenanceRecord);
  const updateMaintenance = useMutation(api.maintenance.updateMaintenance);

  const [apartmentId, setApartmentId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState(0);
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<"pending" | "in_progress" | "done">("pending");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!maintenance;

  useEffect(() => {
    if (maintenance) {
      setApartmentId(maintenance.apartmentId || "");
      setTitle(maintenance.title);
      setCost(maintenance.cost);
      setDate(new Date(maintenance.date).toISOString().split("T")[0]);
      setStatus(maintenance.status);
      setDescription(maintenance.description || "");
    } else {
      // Reset form for new maintenance
      setApartmentId("");
      setTitle("");
      setCost(0);
      setDate(new Date().toISOString().split("T")[0]);
      setStatus("pending");
      setDescription("");
    }
    setError(null);
  }, [maintenance, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate cost - must be strictly greater than 0
      if (cost <= 0) {
        setError("يجب أن تكون التكلفة أكبر من صفر");
        setIsLoading(false);
        return;
      }

      if (isEdit) {
        await updateMaintenance({
          id: maintenance._id,
          title,
          cost,
          date: new Date(date).getTime(),
          status,
          description: description || undefined,
          apartmentId: apartmentId ? apartmentId as Id<"apartments"> : undefined,
        });
      } else {
        await addMaintenance({
          apartmentId: apartmentId ? apartmentId as Id<"apartments"> : undefined,
          title,
          cost,
          date: new Date(date).getTime(),
          status,
          description: description || undefined,
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving maintenance:", error);
      setError("حدث خطأ أثناء حفظ سجل الصيانة");
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions = [
    { value: "pending", label: "معلق" },
    { value: "in_progress", label: "قيد التنفيذ" },
    { value: "done", label: "مكتمل" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "تعديل صيانة" : "إضافة صيانة جديدة"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "قم بتعديل بيانات الصيانة أدناه"
              : "أضف سجل صيانة جديد"}
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
              <Label htmlFor="apartment" className="text-start">
                الشقة
              </Label>
              <Select value={apartmentId} onValueChange={setApartmentId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="اختر الشقة (اختياري)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">عام (المبنى ككل)</SelectItem>
                  {apartments?.map((apt: Apartment) => (
                    <SelectItem key={apt._id} value={apt._id}>
                      {apt.unitLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-start">
                العنوان
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                placeholder="مثال: إصلاح التكييف"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cost" className="text-start">
                التكلفة
              </Label>
              <Input
                id="cost"
                type="number"
                min={1}
                value={cost}
                onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                className="col-span-3"
                placeholder="مثال: 500"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-start">
                التاريخ
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

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-start">
                الحالة
              </Label>
              <Select
                value={status}
                onValueChange={(v: "pending" | "in_progress" | "done") => setStatus(v)}
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
