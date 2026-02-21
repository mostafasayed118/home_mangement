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
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
  occupied: "bg-green-100 text-green-800",
  vacant: "bg-gray-100 text-gray-800",
  maintenance: "bg-blue-100 text-blue-800",
};

export default function ApartmentsPage() {
  const apartments = useQuery(api.apartments.getAll);
  const deleteApartment = useMutation(api.apartments.deleteApartment);

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
    } catch (error) {
      console.error("Error deleting apartment:", error);
      alert("لا يمكن حذف هذه الشقة لأنها تحتوي على مستأجر نشط");
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
            <h1 className="text-3xl font-bold text-gray-900">الشقق</h1>
            <p className="text-gray-500 mt-2">
              إدارة الشقق والسكن
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
                <TableHead className="text-right">رقم الشقة</TableHead>
                <TableHead className="text-right">الدور</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الإيجار الشهري</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apartments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    لا توجد شقق مسجلة
                  </TableCell>
                </TableRow>
              ) : (
                apartments.map((apartment) => (
                  <TableRow key={apartment._id}>
                    <TableCell className="font-medium">{apartment.unitLabel}</TableCell>
                    <TableCell>{apartment.floor}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[apartment.status]}`}
                      >
                        {statusLabels[apartment.status]}
                      </span>
                    </TableCell>
                    <TableCell>{apartment.rentAmount.toLocaleString()} ج.م</TableCell>
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
                            onClick={() => handleEdit(apartment as Apartment)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingApartment(apartment as Apartment)}
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
        <ApartmentFormModal
          open={isFormOpen}
          onOpenChange={handleFormClose}
          apartment={editingApartment}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingApartment}
          onOpenChange={(open) => !open && setDeletingApartment(null)}
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
