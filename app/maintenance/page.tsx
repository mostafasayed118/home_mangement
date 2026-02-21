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
import { MaintenanceFormModal } from "@/components/maintenance/MaintenanceFormModal";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

// Base maintenance type from schema
interface Maintenance {
  _id: Id<"maintenance">;
  apartmentId?: Id<"apartments">;
  title: string;
  cost: number;
  date: number;
  status: "pending" | "in_progress" | "done";
  description?: string;
  createdAt: number;
  updatedAt: number;
}

// Enriched maintenance type with apartment info
interface EnrichedMaintenance extends Maintenance {
  apartment?: {
    _id: Id<"apartments">;
    unitLabel: string;
    floor: number;
  } | null;
}

const statusLabels: Record<string, string> = {
  pending: "معلق",
  in_progress: "قيد التنفيذ",
  done: "مكتمل",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
};

export default function MaintenancePage() {
  const maintenance = useQuery(api.maintenance.getAll) as EnrichedMaintenance[] | undefined;
  const deleteMaintenance = useMutation(api.maintenance.deleteMaintenance);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<EnrichedMaintenance | null>(null);
  const [deletingMaintenance, setDeletingMaintenance] = useState<EnrichedMaintenance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (record: EnrichedMaintenance) => {
    setEditingMaintenance(record);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingMaintenance) return;
    
    setIsDeleting(true);
    try {
      await deleteMaintenance({ id: deletingMaintenance._id });
      setDeletingMaintenance(null);
    } catch (error) {
      console.error("Error deleting maintenance:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingMaintenance(null);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("ar-EG");
  };

  if (!maintenance) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Calculate total cost
  const totalCost = maintenance.reduce((sum, m) => sum + m.cost, 0);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">الصيانة</h1>
            <p className="text-gray-500 mt-2">
              إدارة صيانة الشقق والمبنى
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            إضافة جديد
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">إجمالي التكاليف</div>
            <div className="text-2xl font-bold">{totalCost.toLocaleString()} ج.م</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">قيد التنفيذ</div>
            <div className="text-2xl font-bold">
              {maintenance.filter(m => m.status === "in_progress").length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">مكتمل</div>
            <div className="text-2xl font-bold">
              {maintenance.filter(m => m.status === "done").length}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-right">الشقة</TableHead>
                <TableHead className="text-right">التكلفة</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    لا توجد سجلات صيانة
                  </TableCell>
                </TableRow>
              ) : (
                maintenance.map((record) => (
                  <TableRow key={record._id}>
                    <TableCell>{formatDate(record.date)}</TableCell>
                    <TableCell className="font-medium">{record.title}</TableCell>
                    <TableCell>{record.apartment?.unitLabel || "عام"}</TableCell>
                    <TableCell>{record.cost.toLocaleString()} ج.م</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[record.status]}`}
                      >
                        {statusLabels[record.status]}
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
                            onClick={() => handleEdit(record)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingMaintenance(record)}
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
        <MaintenanceFormModal
          open={isFormOpen}
          onOpenChange={handleFormClose}
          maintenance={editingMaintenance}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingMaintenance}
          onOpenChange={(open) => !open && setDeletingMaintenance(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف سجل الصيانة "{deletingMaintenance?.title}"؟
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
