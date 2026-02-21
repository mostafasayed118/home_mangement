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
import { PaymentFormModal } from "@/components/payments/PaymentFormModal";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

// Base payment type from schema
interface Payment {
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
  createdAt: number;
  updatedAt: number;
}

// Enriched payment type with tenant and apartment info
interface EnrichedPayment extends Payment {
  tenant?: {
    _id: Id<"tenants">;
    name: string;
    phone: string;
    nationalId: string;
  } | null;
  apartment?: {
    _id: Id<"apartments">;
    unitLabel: string;
    floor: number;
  } | null;
}

const statusLabels: Record<string, string> = {
  paid: "مدفوع",
  pending: "معلق",
  late: "متأخر",
  partial: "جزئي",
};

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  late: "bg-red-100 text-red-800",
  partial: "bg-purple-100 text-purple-800",
};

const monthNames: Record<number, string> = {
  1: "يناير",
  2: "فبراير",
  3: "مارس",
  4: "أبريل",
  5: "مايو",
  6: "يونيو",
  7: "يوليو",
  8: "أغسطس",
  9: "سبتمبر",
  10: "أكتوبر",
  11: "نوفمبر",
  12: "ديسمبر",
};

export default function PaymentsPage() {
  const payments = useQuery(api.payments.getAll) as EnrichedPayment[] | undefined;
  const deletePayment = useMutation(api.payments.deletePayment);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<EnrichedPayment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<EnrichedPayment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (payment: EnrichedPayment) => {
    setEditingPayment(payment);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingPayment) return;
    
    setIsDeleting(true);
    try {
      await deletePayment({ id: deletingPayment._id });
      setDeletingPayment(null);
    } catch (error) {
      console.error("Error deleting payment:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingPayment(null);
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString("ar-EG");
  };

  if (!payments) {
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
            <h1 className="text-3xl font-bold text-gray-900">المدفوعات</h1>
            <p className="text-gray-500 mt-2">
              إدارة المدفوعات الإيجارية
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
                <TableHead className="text-right">الشهر</TableHead>
                <TableHead className="text-right">المستأجر</TableHead>
                <TableHead className="text-right">الشقة</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">تاريخ الاستحقاق</TableHead>
                <TableHead className="text-right">تاريخ الدفع</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    لا توجد مدفوعات
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment._id}>
                    <TableCell>
                      {monthNames[payment.month]} {payment.year}
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.tenant?.name || "-"}
                    </TableCell>
                    <TableCell>
                      {payment.apartment?.unitLabel || "-"}
                    </TableCell>
                    <TableCell>{payment.amount.toLocaleString()} ج.م</TableCell>
                    <TableCell>{formatDate(payment.dueDate)}</TableCell>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[payment.status]}`}
                      >
                        {statusLabels[payment.status]}
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
                            onClick={() => handleEdit(payment)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingPayment(payment)}
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
        <PaymentFormModal
          open={isFormOpen}
          onOpenChange={handleFormClose}
          payment={editingPayment}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingPayment}
          onOpenChange={(open) => !open && setDeletingPayment(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذه الدفعة؟
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
