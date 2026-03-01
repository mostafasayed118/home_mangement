"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TenantFormModal } from "@/components/tenants/TenantFormModal";
import { Plus, MoreHorizontal, Edit, Trash2, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { useToast } from "@/lib/toast";

type TenantStatus = "active" | "inactive" | "pending";

interface Tenant {
  _id: Id<"tenants">;
  apartmentId: Id<"apartments">;
  name: string;
  phone: string;
  nationalId: string;
  depositAmount: number;
  leaseStartDate: number;
  leaseEndDate: number;
  isActive: boolean;
  status?: TenantStatus;
  apartment: {
    _id: Id<"apartments">;
    unitLabel: string;
    floor: number;
    status: string;
    rentAmount: number;
  } | null;
  createdAt: number;
  updatedAt: number;
}

// Status configuration with labels, colors, and icons
const statusConfig: Record<TenantStatus, { label: string; bgColor: string; textColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: {
    label: "نشط",
    bgColor: "bg-green-100 dark:bg-green-900",
    textColor: "text-green-800 dark:text-green-200",
    icon: CheckCircle,
  },
  inactive: {
    label: "منتهي",
    bgColor: "bg-gray-100 dark:bg-gray-700",
    textColor: "text-gray-800 dark:text-gray-200",
    icon: XCircle,
  },
  pending: {
    label: "معلق",
    bgColor: "bg-yellow-100 dark:bg-yellow-900",
    textColor: "text-yellow-800 dark:text-yellow-200",
    icon: Clock,
  },
};

// Helper function to get tenant status (defaults based on isActive for backwards compatibility)
function getTenantStatus(tenant: Tenant): TenantStatus {
  if (tenant.status) return tenant.status;
  return tenant.isActive ? "active" : "inactive";
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function TenantsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const debouncedSearch = useDebounce(searchInput, 300);
  
  // Reset cursor when search changes
  useEffect(() => {
    setCursor(undefined);
    setHasMore(false);
  }, [debouncedSearch]);
  
  const tenantsData = useQuery(
    api.tenants.getAll, 
    debouncedSearch 
      ? { search: debouncedSearch, cursor, numResults: 20 } 
      : { cursor, numResults: 20 }
  );
  
  const tenants = tenantsData?.tenants ?? [];
  const deleteTenant = useMutation(api.tenants.deleteTenant);
  const updateStatus = useMutation(api.tenants.updateStatus);
  const { addToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<Id<"tenants"> | null>(null);

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingTenant) return;
    
    setIsDeleting(true);
    try {
      await deleteTenant({ id: deletingTenant._id });
      setDeletingTenant(null);
      addToast("تم حذف المستأجر بنجاح", "success");
    } catch (error: unknown) {
      console.error("Error deleting tenant:", error);
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء حذف المستأجر";
      addToast(errorMessage, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (tenantId: Id<"tenants">, newStatus: TenantStatus) => {
    setUpdatingStatusId(tenantId);
    try {
      await updateStatus({ id: tenantId, status: newStatus });
      const statusLabel = statusConfig[newStatus].label;
      addToast(`تم تحديث الحالة إلى "${statusLabel}"`, "success");
    } catch (error: unknown) {
      console.error("Error updating tenant status:", error);
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الحالة";
      addToast(errorMessage, "error");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTenant(null);
  };

  const loadMore = () => {
    if (tenantsData?.continueCursor) {
      setCursor(tenantsData.continueCursor);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ج.م`;
  };

  // Update hasMore state when data changes
  useEffect(() => {
    if (tenantsData) {
      setHasMore(tenantsData.hasMore ?? false);
    }
  }, [tenantsData]);

  if (!tenantsData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 lg:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">المستأجرين</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
              إدارة بيانات المستأجرين
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            إضافة مستأجر
          </Button>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="البحث بالاسم أو رقم الهاتف..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pr-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            />
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3">
          {tenants.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
              لا يوجد مستأجرين مسجلين
            </div>
          ) : (
            tenants.map((tenant: Tenant) => {
              const status = getTenantStatus(tenant);
              const statusInfo = statusConfig[status];
              const StatusIcon = statusInfo.icon;
              const isUpdating = updatingStatusId === tenant._id;
              
              return (
                <div
                  key={tenant._id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{tenant.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{tenant.apartment?.unitLabel || "-"}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 mb-3">
                    <p>الهاتف: {tenant.phone}</p>
                    <p>التأمين: {formatCurrency(tenant.depositAmount)}</p>
                    <p>نهاية العقد: {formatDate(tenant.leaseEndDate)}</p>
                  </div>
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={updatingStatusId !== null}>
                          {updatingStatusId !== null ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px] bg-white dark:bg-gray-800">
                        <DropdownMenuLabel className="dark:text-gray-200">تغيير الحالة</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {(Object.keys(statusConfig) as TenantStatus[]).map((s) => {
                          const info = statusConfig[s];
                          const Icon = info.icon;
                          return (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => handleStatusChange(tenant._id, s)}
                              disabled={s === status}
                              className={`flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 ${s === status ? "opacity-50" : ""} ${info.textColor}`}
                            >
                              <Icon className="h-4 w-4" />
                              {info.label}
                            </DropdownMenuItem>
                          );
                        })}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleEdit(tenant)}
                          className="flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-200"
                        >
                          <Edit className="h-4 w-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingTenant(tenant)}
                          className="flex items-center gap-2 cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-900/20 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الشقة</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">الرقم القومي</TableHead>
                  <TableHead className="text-right">التأمين</TableHead>
                  <TableHead className="text-right">بداية العقد</TableHead>
                  <TableHead className="text-right">نهاية العقد</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right w-[100px]">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      لا يوجد مستأجرين مسجلين
                    </TableCell>
                  </TableRow>
                ) : (
                  tenants.map((tenant: Tenant) => {
                    const status = getTenantStatus(tenant);
                    const statusInfo = statusConfig[status];
                    const StatusIcon = statusInfo.icon;
                    const isUpdating = updatingStatusId === tenant._id;
                    
                    return (
                      <TableRow key={tenant._id}>
                        <TableCell className="font-medium dark:text-white">{tenant.name}</TableCell>
                        <TableCell className="dark:text-gray-300">{tenant.apartment?.unitLabel || "-"}</TableCell>
                        <TableCell className="dark:text-gray-300">{tenant.phone}</TableCell>
                        <TableCell className="dark:text-gray-300">{tenant.nationalId}</TableCell>
                        <TableCell className="dark:text-gray-300">{formatCurrency(tenant.depositAmount)}</TableCell>
                        <TableCell className="dark:text-gray-300">{formatDate(tenant.leaseStartDate)}</TableCell>
                        <TableCell className="dark:text-gray-300">{formatDate(tenant.leaseEndDate)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500" disabled={updatingStatusId !== null}>
                                {updatingStatusId !== null ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px] bg-white dark:bg-gray-800">
                              <DropdownMenuLabel className="dark:text-gray-200">تغيير الحالة</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {(Object.keys(statusConfig) as TenantStatus[]).map((s) => {
                                const info = statusConfig[s];
                                const Icon = info.icon;
                                return (
                                  <DropdownMenuItem
                                    key={s}
                                    onClick={() => handleStatusChange(tenant._id, s)}
                                    disabled={s === status}
                                    className={`flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 ${s === status ? "opacity-50" : ""} ${info.textColor}`}
                                  >
                                    <Icon className="h-4 w-4" />
                                    {info.label}
                                  </DropdownMenuItem>
                                );
                              })}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleEdit(tenant)}
                                className="flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-200"
                              >
                                <Edit className="h-4 w-4" />
                                تعديل
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeletingTenant(tenant)}
                                className="flex items-center gap-2 cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600 dark:focus:bg-red-900/20 dark:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={loadMore}
              className="dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              تحميل المزيد
            </Button>
          </div>
        )}

        {/* Add/Edit Modal */}
        <TenantFormModal
          open={isFormOpen}
          onOpenChange={handleFormClose}
          tenant={editingTenant}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingTenant}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingTenant(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف المستأجر {deletingTenant?.name}؟ 
                هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingTenant(null)}>
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {isDeleting ? "جاري الحذف..." : "حذف"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
