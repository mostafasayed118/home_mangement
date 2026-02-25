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
import { ApartmentFormModal } from "@/components/apartments/ApartmentFormModal";
import { Plus, MoreHorizontal, Edit, Trash2, FileText } from "lucide-react";
import { useToast } from "@/lib/toast";
import Link from "next/link";

interface Apartment {
  _id: Id<"apartments">;
  floor: number;
  unitNumber: string;
  unitLabel: string;
  status: "occupied" | "vacant" | "maintenance";
  rentAmount: number;
  createdAt: number;
  updatedAt: number;
}

const statusLabels: Record<string, string> = {
  occupied: "مؤجرة",
  vacant: "شاغرة",
  maintenance: "صيانة",
};

const statusColors: Record<string, string> = {
  occupied: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  vacant: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  maintenance: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export default function ApartmentsPage() {
  const apartments = useQuery(api.apartments.getAll);
  const deleteApartment = useMutation(api.apartments.deleteApartment);
  const { addToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  const [deletingApartment, setDeletingApartment] = useState<Apartment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (apartment: Apartment) => {
    setEditingApartment(apartment);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingApartment) return;
    
    setIsDeleting(true);
    try {
      await deleteApartment({ id: deletingApartment._id });
      setDeletingApartment(null);
      addToast("تم حذف الشقة بنجاح", "success");
    } catch (error: unknown) {
      console.error("Error deleting apartment:", error);
      const errorMessage = error instanceof Error ? error.message : "لا يمكن حذف هذه الشقة لأنها تحتوي على مستأجر نشط";
      addToast(errorMessage, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingApartment(null);
  };

  if (!apartments) {
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">الشقق</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
              إدارة الشقق والسكن
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            إضافة جديد
          </Button>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3">
          {apartments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
              لا توجد شقق مسجلة
            </div>
          ) : (
            apartments.map((apartment) => (
              <div
                key={apartment._id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{apartment.unitLabel}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">الدور {apartment.floor}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[apartment.status]}`}
                  >
                    {statusLabels[apartment.status]}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {apartment.rentAmount.toLocaleString()} ج.م
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px] bg-white dark:bg-gray-800">
                      <DropdownMenuItem
                        onClick={() => handleEdit(apartment)}
                        className="flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-200"
                      >
                        <Edit className="h-4 w-4" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/invoices?apartment=${apartment._id}`}
                          className="flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-200 w-full"
                        >
                          <FileText className="h-4 w-4" />
                          عرض الفواتير
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingApartment(apartment)}
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
                  <TableHead className="text-right">رقم الشقة</TableHead>
                  <TableHead className="text-right">الدور</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإيجار الشهري</TableHead>
                  <TableHead className="text-right w-[100px]">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apartments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      لا توجد شقق مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  apartments.map((apartment) => (
                    <TableRow key={apartment._id}>
                      <TableCell className="font-medium dark:text-white">{apartment.unitLabel}</TableCell>
                      <TableCell className="dark:text-gray-300">{apartment.floor}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[apartment.status]}`}
                        >
                          {statusLabels[apartment.status]}
                        </span>
                      </TableCell>
                      <TableCell className="dark:text-gray-300">{apartment.rentAmount.toLocaleString()} ج.م</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px] bg-white dark:bg-gray-800">
                            <DropdownMenuItem
                              onClick={() => handleEdit(apartment)}
                              className="flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-200"
                            >
                              <Edit className="h-4 w-4" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/invoices?apartment=${apartment._id}`}
                                className="flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-200 w-full"
                              >
                                <FileText className="h-4 w-4" />
                                عرض الفواتير
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingApartment(apartment)}
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
        <ApartmentFormModal
          open={isFormOpen}
          onOpenChange={handleFormClose}
          apartment={editingApartment}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingApartment}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingApartment(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف الشقة {deletingApartment?.unitLabel}؟ 
                هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingApartment(null)}>
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
