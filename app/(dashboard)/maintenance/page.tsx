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
import { Plus, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/lib/toast";

interface Maintenance {
  _id: Id<"maintenance">;
  apartmentId?: Id<"apartments">;
  title: string;
  cost: number;
  date: number;
  status: "pending" | "in_progress" | "done";
  description?: string;
  apartment: {
    _id: Id<"apartments">;
    unitLabel: string;
  } | null;
  createdAt: number;
  updatedAt: number;
}

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  in_progress: "قيد التنفيذ",
  done: "مكتمل",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default function MaintenancePage() {
  const maintenanceRecords = useQuery(api.maintenance.getAll);
  const deleteMaintenance = useMutation(api.maintenance.deleteMaintenance);
  const { addToast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [deletingMaintenance, setDeletingMaintenance] = useState<Maintenance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = (maintenance: Maintenance) => {
    setEditingMaintenance(maintenance);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingMaintenance) return;
    
    setIsDeleting(true);
    try {
      await deleteMaintenance({ id: deletingMaintenance._id });
      setDeletingMaintenance(null);
      addToast("تم حذف سجل الصيانة بنجاح", "success");
    } catch (error: unknown) {
      console.error("Error deleting maintenance:", error);
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء حذف سجل الصيانة";
      addToast(errorMessage, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingMaintenance(null);
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

  if (!maintenanceRecords) {
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">الصيانة</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
              إدارة طلبات الصيانة والمصاريف
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            إضافة طلب
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 lg:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">إجمالي الطلبات</p>
            <p className="text-xl sm:text-2xl font-bold dark:text-white">{maintenanceRecords.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">قيد الانتظار</p>
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">
              {maintenanceRecords.filter((m: Maintenance) => m.status === "pending").length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">قيد التنفيذ</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">
              {maintenanceRecords.filter((m: Maintenance) => m.status === "in_progress").length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">إجمالي التكاليف</p>
            <p className="text-xl sm:text-2xl font-bold dark:text-white">
              {formatCurrency(maintenanceRecords.reduce((sum: number, m: Maintenance) => sum + m.cost, 0))}
            </p>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3">
          {maintenanceRecords.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
              لا توجد طلبات صيانة مسجلة
            </div>
          ) : (
            maintenanceRecords.map((maintenance: Maintenance) => (
              <div
                key={maintenance._id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{maintenance.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{maintenance.apartment?.unitLabel || "عام"}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[maintenance.status]}`}
                  >
                    {statusLabels[maintenance.status]}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 mb-3">
                  <p>التكلفة: {formatCurrency(maintenance.cost)}</p>
                  <p>التاريخ: {formatDate(maintenance.date)}</p>
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
                        onClick={() => handleEdit(maintenance)}
                        className="flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-200"
                      >
                        <Edit className="h-4 w-4" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingMaintenance(maintenance)}
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
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">الشقة</TableHead>
                  <TableHead className="text-right">التكلفة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right w-[100px]">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenanceRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      لا توجد طلبات صيانة مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  maintenanceRecords.map((maintenance: Maintenance) => (
                    <TableRow key={maintenance._id}>
                      <TableCell className="font-medium dark:text-white">{maintenance.title}</TableCell>
                      <TableCell className="dark:text-gray-300">
                        {maintenance.apartment?.unitLabel || "عام"}
                      </TableCell>
                      <TableCell className="dark:text-gray-300">{formatCurrency(maintenance.cost)}</TableCell>
                      <TableCell className="dark:text-gray-300">{formatDate(maintenance.date)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[maintenance.status]}`}
                        >
                          {statusLabels[maintenance.status]}
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
                              onClick={() => handleEdit(maintenance)}
                              className="flex items-center gap-2 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 dark:text-gray-200"
                            >
                              <Edit className="h-4 w-4" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingMaintenance(maintenance)}
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
        <MaintenanceFormModal
          open={isFormOpen}
          onOpenChange={handleFormClose}
          maintenance={editingMaintenance}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingMaintenance}
          onOpenChange={(open) => {
            if (!open) {
              setDeletingMaintenance(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا السجل؟ 
                {deletingMaintenance && (
                  <span className="block mt-2 font-medium">
                    {deletingMaintenance.title} - {formatCurrency(deletingMaintenance.cost)}
                  </span>
                )}
                <br />
                هذا الإجراء لا يمكن التراجع عنه.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeletingMaintenance(null)}>
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
