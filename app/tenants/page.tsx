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
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

// Base tenant type from schema
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
  createdAt: number;
  updatedAt: number;
}

// Enriched tenant type with apartment info (returned by getAll query)
interface EnrichedTenant extends Tenant {
  apartment?: {
    _id: Id<"apartments">;
    unitLabel: string;
    floor: number;
    status: string;
    rentAmount: number;
  } | null;
}

const statusLabels: Record<string, string> = {
  occupied: "مؤجرة",
  vacant: "شاغرة",
  maintenance: "صيانة",
};

const statusColors: Record<string, string> = {
  occupied: "bg-green-100 text-green-800",
  vacant: "bg-gray-100 text-gray-800",
  maintenance: "bg-blue-100 text-blue-800",
};

export default function TenantsPage() {
  const tenants = useQuery(api.tenants.getAll) as EnrichedTenant[] | undefined;
  const deleteTenant = useMutation(api.tenants.deleteTenant);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<EnrichedTenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<EnrichedTenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (tenant: EnrichedTenant) => {
    setEditingTenant(tenant);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingTenant) return;
    
    setIsDeleting(true);
    try {
      await deleteTenant({ id: deletingTenant._id });
      setDeletingTenant(null);
    } catch (error: any) {
      console.error("Error deleting tenant:", error);
      alert(error?.message || "لا يمكن حذف هذا المستأجر");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTenant(null);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("ar-EG");
  };

  if (!tenants) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">المستأجرون</h1>
            <p className="text-gray-500 mt-2">
              إدارة المستأجرين والعقود
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            إضافة جديد
          </Button>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">الشقة</TableHead>
                <TableHead className="text-right">الهاتف</TableHead>
                <TableHead className="text-right">الرقم الوطني</TableHead>
                <TableHead className="text-right">مبلغ التأمين</TableHead>
                <TableHead className="text-right">نهاية العقد</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    لا يوجد مستأجرون
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow key={tenant._id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.apartment?.unitLabel || "-"}</TableCell>
                    <TableCell>{tenant.phone}</TableCell>
                    <TableCell>{tenant.nationalId}</TableCell>
                    <TableCell>{tenant.depositAmount.toLocaleString()} ج.م</TableCell>
                    <TableCell>{formatDate(tenant.leaseEndDate)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tenant.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {tenant.isActive ? "نشط" : "غير نشط"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleEdit(tenant)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingTenant(tenant)}
                            className="flex items-center gap-2 cursor-pointer text-red-600"
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

        {/* Add/Edit Modal */}
        <TenantFormModal
          open={isFormOpen}
          onOpenChange={handleFormClose}
          tenant={editingTenant}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingTenant}
          onOpenChange={(open) => !open && setDeletingTenant(null)}
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
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
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
