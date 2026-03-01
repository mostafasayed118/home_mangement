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
  const generateContractUploadUrl = useMutation(api.tenants.generateContractUploadUrl);
  const updateTenantContract = useMutation(api.tenants.updateTenantContract);

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
  
  // Contract file upload
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  const contractFileInputRef = useRef<HTMLInputElement>(null);

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

  // Upload contract file and return the storage ID
  const uploadContractFile = async (file: File): Promise<string | null> => {
    // Check file size (10MB max)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setError("حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)");
      return null;
    }

    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateContractUploadUrl({});

      // Step 2: Upload file to the URL
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Failed to upload file");
      }

      // Get the storage ID from response
      const responseText = await result.text();
      let storageId: string | null = null;
      
      // Try header first (older Convex versions)
      const headerStorageId = result.headers.get("x-convex-stor-id");
      if (headerStorageId) {
        storageId = headerStorageId;
      } else {
        // Try parsing from body (newer Convex versions)
        try {
          const responseJson = JSON.parse(responseText);
          storageId = responseJson.storageId || null;
        } catch (e) {
          console.error("Failed to parse response:", responseText);
        }
      }

      if (!storageId) {
        console.error("Upload response:", result);
        console.error("Response status:", result.status);
        throw new Error("Failed to get storage ID");
      }

      return storageId;
    } catch (uploadError) {
      console.error("Error uploading contract:", uploadError);
      setError("حدث خطأ في رفع ملف العقد");
      return null;
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
      setContractFile(null);
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
        
        // If there's a new contract file, upload it
        if (contractFile) {
          setIsUploadingContract(true);
          const contractFileId = await uploadContractFile(contractFile);
          setIsUploadingContract(false);
          
          if (contractFileId) {
            await updateTenantContract({
              tenantId: tenant._id,
              contractFileId: contractFileId as Id<"_storage">,
            });
          }
        }
      } else {
        if (!apartmentId) {
          setError("الرجاء اختيار الشقة");
          setIsLoading(false);
          return;
        }
        
        let contractFileId: string | undefined = undefined;
        
        // Upload contract file if provided
        if (contractFile) {
          setIsUploadingContract(true);
          const uploadedId = await uploadContractFile(contractFile);
          setIsUploadingContract(false);
          
          if (!uploadedId) {
            setIsLoading(false);
            return; // Error already set in uploadContractFile
          }
          contractFileId = uploadedId;
        }
        
        await addTenant({
          apartmentId: apartmentId as Id<"apartments">,
          name,
          phone,
          nationalId,
          depositAmount,
          leaseStartDate: new Date(leaseStartDate).getTime(),
          leaseEndDate: new Date(leaseEndDate).getTime(),
          contractFileId: contractFileId as Id<"_storage"> | undefined,
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

            {/* Apartment selection - available in both create and edit modes */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apartment" className="text-start">
                الشقة
              </Label>
              <Select
                value={apartmentId}
                onValueChange={setApartmentId}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={isEdit ? "الشقة الحالية" : "اختر الشقة"} />
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

            {/* Contract File Upload */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contractFile" className="text-start">
                عقد الإيجار
              </Label>
              <div className="col-span-3">
                <input
                  ref={contractFileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="contract-file-upload"
                />
                <label
                  htmlFor="contract-file-upload"
                  className="flex items-center justify-center w-full h-10 px-4 transition bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  {contractFile ? (
                    <span className="text-sm text-green-600 dark:text-green-400 truncate">
                      {contractFile.name}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">
                      اختر ملف (PDF أو صورة)
                    </span>
                  )}
                </label>
                {contractFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setContractFile(null);
                      if (contractFileInputRef.current) {
                        contractFileInputRef.current.value = "";
                      }
                    }}
                    className="text-xs text-red-500 mt-1 hover:underline"
                  >
                    إزالة الملف
                  </button>
                )}
              </div>
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
            <Button type="submit" disabled={isLoading || isUploadingContract}>
              {isLoading || isUploadingContract 
                ? (isUploadingContract ? "جاري رفع العقد..." : "جاري الحفظ...") 
                : (isEdit ? "تحديث" : "إضافة")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
