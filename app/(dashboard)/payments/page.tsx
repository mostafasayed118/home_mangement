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
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/lib/toast";

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
  tenant: {
    _id: Id<"tenants">;
    name: string;
  } | null;
  apartment: {
    _id: Id<"apartments">;
    unitLabel: string;
  } | null;
  createdAt: number;
  updatedAt: number;
}

const statusLabels: Record<string, string> = {
  paid: "مدفوع",
  pending: "قيد الانتظار",
  late: "متأخر",
  partial: "دفع جزئي",
};

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  late: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  partial: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const monthLabels: Record<number, string> = {
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
  const payments = useQuery(api.payments.getAll);
  const deletePayment = useMutation(api.payments.deletePayment);
  const { addToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingPayment) return;
    
    setIsDeleting(true);
    try {
      await deletePayment({ id: deletingPayment._id });
      setDeletingPayment(null);
      addToast("تم حذف الدفعة بنجاح", "success");
    } catch (error: unknown) {
      console.error("Error deleting payment:", error);
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء حذف الدفعة";
      addToast(errorMessage, "error");
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
    return new Date(timestamp).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ج.م`;
  };

  if (!payments) {
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">الدفعات</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
              إدارة دفعات الإيجار
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            إضافة دفعة
          </Button>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3">
          {payments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
              لا توجد دفعات مسجلة
            </div>
          ) : (
            payments.map((payment: Payment) => (
              <div
                key={payment._id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{payment.tenant?.name || "-"}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{payment.apartment?.unitLabel || "-"}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[payment.status]}`}
                  >
                    {statusLabels[payment.status]}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 mb-3">
                  <p>المبلغ: {formatCurrency(payment.amount)}</p>
                  <p>الشهر: {monthLabels[payment.month]} {payment.year}</p>
                  <p>تاريخ الاستحقاق: {formatDate(payment.dueDate)}</p>
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
                        onClick={() => handleEdit(payment)}
                        className="flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-200"
                      >
                        <Edit className="h-4 w-4" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingPayment(payment)}
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
                  <TableHead className="text-right">المستأجر</TableHead>
                  <TableHead className="text-right">الشقة</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الشهر</TableHead>
                  <TableHead className="text-right">تاريخ الاستحقاق</TableHead>
                  <TableHead className="text-right">تاريخ الدفع</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right w-[100px]">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      لا توجد دفعات مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment: Payment) => (
                    <TableRow key={payment._id}>
                      <TableCell className="font-medium dark:text-white">{payment.tenant?.name || "-"}</TableCell>
                      <TableCell className="dark:text-gray-300">{payment.apartment?.unitLabel || "-"}</TableCell>
                      <TableCell className="dark:text-gray-300">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="dark:text-gray-300">{monthLabels[payment.month]} {payment.year}</TableCell>
                      <TableCell className="dark:text-gray-300">{formatDate(payment.dueDate)}</TableCell>
                      <TableCell className="dark:text-gray-300">{formatDate(payment.paymentDate)}</TableCell>
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
                            <Button variant="ghost" className="h-8 w-8 p-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px] bg-white dark:bg-gray-800">
                            <DropdownMenuItem
                              onClick={() => handleEdit(payment)}
                              className="flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-200"
                            >
                              <Edit className="h-4 w-4" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingPayment(payment)}
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
        <PaymentFormModal
          open={isFormOpen}
          onOpenChange={handleFormClose}
          payment={editingPayment}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingPayment}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingPayment(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذه الدفعة؟ 
                {deletingPayment && (
                  <span className="block mt-2 font-medium">
                    {formatCurrency(deletingPayment.amount)} - {monthLabels[deletingPayment.month]} {deletingPayment.year}
                  </span>
                )}
                <br />
                هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingPayment(null)}>
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
