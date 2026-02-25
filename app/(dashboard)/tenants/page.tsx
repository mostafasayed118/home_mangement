"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
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
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/lib/toast";

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

export default function TenantsPage() {
  const tenants = useQuery(api.tenants.getAll);
  const deleteTenant = useMutation(api.tenants.deleteTenant);
  const { addToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTenant(null);
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

  if (!tenants) {
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

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3">
          {tenants.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
              لا يوجد مستأجرين مسجلين
            </div>
          ) : (
            tenants.map((tenant: Tenant) => (
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
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tenant.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {tenant.isActive ? "نشط" : "منتهي"}
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
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px] bg-white dark:bg-gray-800">
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
            ))
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
                  tenants.map((tenant: Tenant) => (
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
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tenant.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {tenant.isActive ? "نشط" : "منتهي"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px] bg-white dark:bg-gray-800">
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

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
