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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InvoiceFormModal } from "@/components/invoices/InvoiceFormModal";
import { Plus, MoreHorizontal, Edit, Trash2, Eye, FileImage } from "lucide-react";
import { useToast } from "@/lib/toast";

interface Invoice {
  _id: Id<"invoices">;
  apartmentId: Id<"apartments">;
  amount: number;
  type: string;
  date: number;
  status: "paid" | "pending";
  receiptImageId?: Id<"_storage">;
  receiptImageUrl?: string | null;
  description?: string;
  apartment: {
    _id: Id<"apartments">;
    unitLabel: string;
    floor: number;
  } | null;
  createdAt: number;
  updatedAt: number;
}

const statusLabels: Record<string, string> = {
  paid: "مدفوعة",
  pending: "معلقة",
};

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

const typeLabels: Record<string, string> = {
  electricity: "كهرباء",
  water: "مياه",
  gas: "غاز",
  maintenance: "صيانة",
  internet: "إنترنت",
  other: "أخرى",
};

export default function InvoicesPage() {
  const invoices = useQuery(api.invoices.getAll);
  const deleteInvoice = useMutation(api.invoices.deleteInvoice);
  const { addToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingInvoice) return;
    
    setIsDeleting(true);
    try {
      await deleteInvoice({ id: deletingInvoice._id });
      setDeletingInvoice(null);
      addToast("تم حذف الفاتورة بنجاح", "success");
    } catch (error: unknown) {
      console.error("Error deleting invoice:", error);
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء حذف الفاتورة";
      addToast(errorMessage, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingInvoice(null);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ج.م`;
  };

  if (!invoices) {
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">الفواتير</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
              إدارة فواتير الكهرباء والمياه والصيانة
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            إضافة فاتورة
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 lg:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">إجمالي الفواتير</p>
            <p className="text-xl sm:text-2xl font-bold dark:text-white">{invoices.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">المدفوعة</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600">
              {invoices.filter((i) => i.status === "paid").length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">المعلقة</p>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">
              {invoices.filter((i) => i.status === "pending").length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">إجمالي المبالغ</p>
            <p className="text-xl sm:text-2xl font-bold dark:text-white">
              {formatCurrency(invoices.reduce((sum, i) => sum + i.amount, 0))}
            </p>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3">
          {invoices.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
              لا توجد فواتير مسجلة
            </div>
          ) : (
            invoices.map((invoice) => (
              <div
                key={invoice._id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{invoice.apartment?.unitLabel || "-"}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{typeLabels[invoice.type] || invoice.type}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[invoice.status]}`}
                  >
                    {statusLabels[invoice.status]}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 mb-3">
                  <p>المبلغ: {formatCurrency(invoice.amount)}</p>
                  <p>التاريخ: {formatDate(invoice.date)}</p>
                  {invoice.receiptImageUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingImage(invoice.receiptImageUrl!)}
                      className="p-0 h-auto text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      <FileImage className="h-4 w-4 ml-1" />
                      عرض الإيصال
                    </Button>
                  )}
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
                        onClick={() => handleEdit(invoice)}
                        className="flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-200"
                      >
                        <Edit className="h-4 w-4" />
                        تعديل
                      </DropdownMenuItem>
                      {invoice.receiptImageUrl && (
                        <DropdownMenuItem
                          onClick={() => setViewingImage(invoice.receiptImageUrl!)}
                          className="flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-200"
                        >
                          <Eye className="h-4 w-4" />
                          عرض الإيصال
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setDeletingInvoice(invoice)}
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
                  <TableHead className="text-right">الشقة</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإيصال</TableHead>
                  <TableHead className="text-right w-[100px]">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      لا توجد فواتير مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow key={invoice._id}>
                      <TableCell className="font-medium dark:text-white">
                        {invoice.apartment?.unitLabel || "-"}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">
                        {typeLabels[invoice.type] || invoice.type}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell className="dark:text-gray-300">{formatDate(invoice.date)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[invoice.status]}`}
                        >
                          {statusLabels[invoice.status]}
                        </span>
                      </TableCell>
                      <TableCell>
                        {invoice.receiptImageUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => invoice.receiptImageUrl && setViewingImage(invoice.receiptImageUrl)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <FileImage className="h-4 w-4" />
                            عرض
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-sm">لا يوجد</span>
                        )}
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
                              onClick={() => handleEdit(invoice)}
                              className="flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-200"
                            >
                              <Edit className="h-4 w-4" />
                              تعديل
                            </DropdownMenuItem>
                            {invoice.receiptImageUrl && (
                              <DropdownMenuItem
                                onClick={() => invoice.receiptImageUrl && setViewingImage(invoice.receiptImageUrl)}
                                className="flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-200"
                              >
                                <Eye className="h-4 w-4" />
                                عرض الإيصال
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setDeletingInvoice(invoice)}
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
        <InvoiceFormModal
          open={isFormOpen}
          onOpenChange={handleFormClose}
          invoice={editingInvoice}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingInvoice}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingInvoice(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذه الفاتورة؟
                {deletingInvoice && (
                  <span className="block mt-2 font-medium">
                    {typeLabels[deletingInvoice.type] || deletingInvoice.type} - 
                    {formatCurrency(deletingInvoice.amount)}
                  </span>
                )}
                <br />
                هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingInvoice(null)}>
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

        {/* Image Preview Dialog */}
        <Dialog open={!!viewingImage} onOpenChange={(open) => !open && setViewingImage(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>صورة الإيصال</DialogTitle>
            </DialogHeader>
            {viewingImage && (
              <div className="flex justify-center">
                <img
                  src={viewingImage}
                  alt="صورة الإيصال"
                  className="max-w-full max-h-[70vh] rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
