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

interface TenantFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: {
    _id: Id<"tenants">;
    apartmentId: Id<"apartments">;
    name: string;
    phone: string;
    nationalId: string;
    depositAmount: number;
    leaseStartDate: number;
    leaseEndDate: number;
    isActive: boolean;
  } | null;
}

interface Apartment {
  _id: Id<"apartments">;
  unitLabel: string;
  status: string;
}

export function TenantFormModal({
  open,
  onOpenChange,
  tenant,
}: TenantFormModalProps) {
  const apartments = useQuery(api.apartments.getAll);
  const addTenant = useMutation(api.tenants.addTenant);
  const updateTenant = useMutation(api.tenants.updateTenant);

  const [apartmentId, setApartmentId] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [depositAmount, setDepositAmount] = useState(0);
  const [leaseStartDate, setLeaseStartDate] = useState("");
  const [leaseEndDate, setLeaseEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const isEdit = !!tenant;

  // Egyptian mobile phone validation regex: must start with 010, 011, 012, or 015
  const EGYPTIAN_PHONE_REGEX = /^01[0125][0-9]{8}$/;

  const validatePhone = (phoneNumber: string): boolean => {
    if (!phoneNumber) {
      setPhoneError("رقم الهاتف مطلوب");
      return false;
    }
    if (!EGYPTIAN_PHONE_REGEX.test(phoneNumber)) {
      setPhoneError("يجب أن يبدأ رقم الهاتف بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقم");
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    // Only validate if user has started typing
    if (value.length > 0) {
      validatePhone(value);
    } else {
      setPhoneError(null);
    }
  };

  useEffect(() => {
    if (tenant) {
      setApartmentId(tenant.apartmentId);
      setName(tenant.name);
      setPhone(tenant.phone);
      setNationalId(tenant.nationalId);
      setDepositAmount(tenant.depositAmount);
      setLeaseStartDate(new Date(tenant.leaseStartDate).toISOString().split("T")[0]);
      setLeaseEndDate(new Date(tenant.leaseEndDate).toISOString().split("T")[0]);
    } else {
      // Reset form for new tenant
      setApartmentId("");
      setName("");
      setPhone("");
      setNationalId("");
      setDepositAmount(0);
      setLeaseStartDate("");
      setLeaseEndDate("");
    }
    setError(null);
    setPhoneError(null);
  }, [tenant, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Validate phone number
      if (!validatePhone(phone)) {
        setIsLoading(false);
        return;
      }

      // Validate lease dates: end date must be strictly after start date
      if (leaseStartDate && leaseEndDate) {
        const startTimestamp = new Date(leaseStartDate).getTime();
        const endTimestamp = new Date(leaseEndDate).getTime();
        
        if (endTimestamp <= startTimestamp) {
          setError("يجب أن يكون تاريخ نهاية العقد بعد تاريخ البداية");
          setIsLoading(false);
          return;
        }
      }

      if (isEdit) {
        // For edit mode, we need to check if apartment changed
        // The updateTenant mutation doesn't include apartmentId
        // So we handle the apartment change separately
        const currentTenant = tenant;
        
        await updateTenant({
          id: tenant._id,
          name,
          phone,
          nationalId,
          depositAmount,
          leaseStartDate: new Date(leaseStartDate).getTime(),
          leaseEndDate: new Date(leaseEndDate).getTime(),
        });
      } else {
        if (!apartmentId) {
          setError("الرجاء اختيار الشقة");
          setIsLoading(false);
          return;
        }
        await addTenant({
          apartmentId: apartmentId as Id<"apartments">,
          name,
          phone,
          nationalId,
          depositAmount,
          leaseStartDate: new Date(leaseStartDate).getTime(),
          leaseEndDate: new Date(leaseEndDate).getTime(),
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving tenant:", error);
      setError("حدث خطأ أثناء حفظ المستأجر");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter vacant apartments for new tenant, but allow all for edit mode
  const availableApartments = apartments?.filter(
    (apt: Apartment) => apt.status === "vacant" || (tenant && apt._id === tenant.apartmentId)
  ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "تعديل مستأجر" : "إضافة مستأجر جديد"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "قم بتعديل بيانات المستأجر أدناه"
              : "أضف مستأجر جديد لشقة شاغرة"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Apartment selection - now visible in both Create and Edit modes */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apartment" className="text-start">
                الشقة
              </Label>
              <Select
                value={apartmentId}
                onValueChange={setApartmentId}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="اختر الشقة" />
                </SelectTrigger>
                <SelectContent>
                  {availableApartments.map((apt: Apartment) => (
                    <SelectItem key={apt._id} value={apt._id}>
                      {apt.unitLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-start">
                الاسم
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-start">
                الهاتف
              </Label>
              <div className="col-span-3">
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className={phoneError ? "border-red-500 focus-visible:ring-red-500" : ""}
                  required
                />
                {phoneError && (
                  <p className="text-red-500 text-sm mt-1">{phoneError}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nationalId" className="text-start">
                الرقم الوطني
              </Label>
              <Input
                id="nationalId"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="depositAmount" className="text-start">
                مبلغ التأمين
              </Label>
              <Input
                id="depositAmount"
                type="number"
                min={0}
                value={depositAmount}
                onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leaseStartDate" className="text-start">
                بداية العقد
              </Label>
              <Input
                id="leaseStartDate"
                type="date"
                value={leaseStartDate}
                onChange={(e) => setLeaseStartDate(e.target.value)}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leaseEndDate" className="text-start">
                نهاية العقد
              </Label>
              <Input
                id="leaseEndDate"
                type="date"
                value={leaseEndDate}
                onChange={(e) => setLeaseEndDate(e.target.value)}
                className="col-span-3"
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "جاري الحفظ..." : isEdit ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
