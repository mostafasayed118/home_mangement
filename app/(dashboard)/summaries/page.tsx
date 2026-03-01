"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, BarChart, TrendingUp, TrendingDown, DollarSign, Save, Calculator, Archive, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/lib/toast";
import { formatCurrencyEGP } from "@/lib/i18n";

interface MonthlySummary {
  _id: Id<"monthlySummaries">;
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

interface MonthPreview {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  paidPaymentsCount: number;
  maintenanceRecordsCount: number;
}

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

export default function SummariesPage() {
  const summaries = useQuery(api.summaries.getSummaries);
  const saveSummary = useMutation(api.summaries.saveSummary);
  const updateSummary = useMutation(api.summaries.updateSummary);
  const deleteSummary = useMutation(api.summaries.deleteSummary);
  const { addToast } = useToast();

  // Selection state
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Preview state
  const [previewData, setPreviewData] = useState<MonthPreview | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);
  
  // Notes state
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSummary, setEditingSummary] = useState<MonthlySummary | null>(null);
  const [editTotalIncome, setEditTotalIncome] = useState("");
  const [editTotalExpenses, setEditTotalExpenses] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete confirmation state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingSummary, setDeletingSummary] = useState<MonthlySummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate preview query
  const calculateMonthPreview = useQuery(
    api.summaries.calculateMonthPreview,
    hasCalculated ? { month: selectedMonth, year: selectedYear } : "skip"
  );

  // Update preview data when query returns
  useEffect(() => {
    if (calculateMonthPreview && hasCalculated) {
      setPreviewData(calculateMonthPreview as MonthPreview);
    }
  }, [calculateMonthPreview, hasCalculated]);

  // Calculate net profit for edit modal
  const editNetProfit = useMemo(() => {
    const income = parseFloat(editTotalIncome) || 0;
    const expenses = parseFloat(editTotalExpenses) || 0;
    return income - expenses;
  }, [editTotalIncome, editTotalExpenses]);

  // Generate year options
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  const handleCalculate = () => {
    setHasCalculated(true);
    setPreviewData(null);
  };

  const handleSaveAndClose = async () => {
    if (!previewData) {
      addToast("يرجى حساب التقرير أولاً", "error");
      return;
    }

    setIsSaving(true);
    try {
      await saveSummary({
        month: selectedMonth,
        year: selectedYear,
        totalIncome: previewData.totalIncome,
        totalExpenses: previewData.totalExpenses,
        notes: notes || undefined,
      });

      addToast("تم حفظ الملخص بنجاح", "success");
      
      setNotes("");
      setPreviewData(null);
      setHasCalculated(false);
    } catch (error) {
      console.error("Error saving summary:", error);
      addToast("حدث خطأ في حفظ التقرير", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditModal = (summary: MonthlySummary) => {
    setEditingSummary(summary);
    setEditTotalIncome(summary.totalIncome.toString());
    setEditTotalExpenses(summary.totalExpenses.toString());
    setEditNotes(summary.notes || "");
    setIsEditModalOpen(true);
  };

  const handleUpdateSummary = async () => {
    if (!editingSummary) return;

    setIsUpdating(true);
    try {
      await updateSummary({
        id: editingSummary._id,
        totalIncome: parseFloat(editTotalIncome) || 0,
        totalExpenses: parseFloat(editTotalExpenses) || 0,
        notes: editNotes || undefined,
      });

      addToast("تم تحديث الملخص بنجاح", "success");
      setIsEditModalOpen(false);
      setEditingSummary(null);
    } catch (error) {
      console.error("Error updating summary:", error);
      addToast("حدث خطأ في تحديث الملخص", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenDeleteDialog = (summary: MonthlySummary) => {
    setDeletingSummary(summary);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSummary = async () => {
    if (!deletingSummary) return;

    setIsDeleting(true);
    try {
      await deleteSummary({ id: deletingSummary._id });
      addToast("تم حذف الملخص بنجاح", "success");
      setIsDeleteDialogOpen(false);
      setDeletingSummary(null);
    } catch (error) {
      console.error("Error deleting summary:", error);
      addToast("حدث خطأ في حذف الملخص", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 pt-20 lg:pt-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <BarChart className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">تقفيل الشهر</h1>
          <p className="text-muted-foreground text-sm">احسب وأغلق الشهر المالي</p>
        </div>
      </div>

      {/* Top Section: Selection Card */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            حساب تقرير الشهر
          </CardTitle>
          <CardDescription>
            اختر الشهر والسنة لحساب الإجماليات تلقائياً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="grid gap-2 flex-1 max-w-[200px]">
              <Label htmlFor="month">الشهر</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => {
                  setSelectedMonth(parseInt(value));
                  setHasCalculated(false);
                  setPreviewData(null);
                }}
              >
                <SelectTrigger id="month">
                  <SelectValue placeholder="اختر الشهر" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(monthNames).map(([num, name]) => (
                    <SelectItem key={num} value={num}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 flex-1 max-w-[150px]">
              <Label htmlFor="year">السنة</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => {
                  setSelectedYear(parseInt(value));
                  setHasCalculated(false);
                  setPreviewData(null);
                }}
              >
                <SelectTrigger id="year">
                  <SelectValue placeholder="اختر السنة" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleCalculate}
              className="gap-2"
            >
              <Calculator className="h-4 w-4" />
              حساب تقرير الشهر
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section: KPI Cards */}
      {previewData && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            معاينة تقرير {monthNames[selectedMonth]} {selectedYear}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Income Card */}
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      إجمالي الإيرادات
                    </p>
                    <p className="mt-2 text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrencyEGP(previewData.totalIncome)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {previewData.paidPaymentsCount} دفعة مدفوعة
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expenses Card */}
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      إجمالي المصروفات
                    </p>
                    <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrencyEGP(previewData.totalExpenses)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {previewData.maintenanceRecordsCount} صيانة
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Net Profit Card */}
            <Card className={`border-2 ${previewData.netProfit >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      صافي الربح
                    </p>
                    <p className={`mt-2 text-2xl font-bold ${
                      previewData.netProfit >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}>
                      {formatCurrencyEGP(previewData.netProfit)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {previewData.netProfit >= 0 ? "ربح" : "خسارة"}
                    </p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    previewData.netProfit >= 0 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <DollarSign className={`h-6 w-6 ${
                      previewData.netProfit >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Section: Notes and Save */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Save className="h-5 w-5" />
                حفظ وإغلاق الشهر
              </CardTitle>
              <CardDescription>
                أضف ملاحظاتك واحفظ التقرير نهائياً
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="notes">ملاحظات الشهر</Label>
                <Textarea
                  id="notes"
                  placeholder="أضف ملاحظاتك حول هذا الشهر (اختياري)"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSaveAndClose}
                disabled={isSaving}
                className="w-full gap-2"
                size="lg"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جارٍ الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    حفظ وإغلاق الشهر
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Archive Section: Data Table */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Archive className="h-5 w-5" />
          أرشيف الشهور المغلقة
        </h2>

        {summaries && summaries.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الشهر</TableHead>
                  <TableHead className="text-right">السنة</TableHead>
                  <TableHead className="text-right">الإيرادات</TableHead>
                  <TableHead className="text-right">المصروفات</TableHead>
                  <TableHead className="text-right">صافي الربح</TableHead>
                  <TableHead className="text-right">الملاحظات</TableHead>
                  <TableHead className="text-right">تاريخ الإغلاق</TableHead>
                  <TableHead className="text-center w-[80px]">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((summary: MonthlySummary) => (
                  <TableRow key={summary._id}>
                    <TableCell className="font-medium">
                      {monthNames[summary.month]}
                    </TableCell>
                    <TableCell>{summary.year}</TableCell>
                    <TableCell className="text-green-600 dark:text-green-400">
                      {formatCurrencyEGP(summary.totalIncome)}
                    </TableCell>
                    <TableCell className="text-red-600 dark:text-red-400">
                      {formatCurrencyEGP(summary.totalExpenses)}
                    </TableCell>
                    <TableCell
                      className={`font-bold ${
                        summary.netProfit >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {formatCurrencyEGP(summary.netProfit)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {summary.notes || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(summary.createdAt).toLocaleDateString("ar-EG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleOpenEditModal(summary)}
                              className="cursor-pointer"
                            >
                              <Pencil className="h-4 w-4 ml-2" />
                              تعديل
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleOpenDeleteDialog(summary)}
                              className="cursor-pointer text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 ml-2" />
                              حذف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
            <Archive className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">لا توجد شهور مغلقة</p>
            <p className="text-sm">ابدأ بإغلاق الشهر الحالي من الأعلى</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              تعديل ملخص شهر {editingSummary ? monthNames[editingSummary.month] : ""} {editingSummary?.year}
            </DialogTitle>
            <DialogDescription>
              قم بتعديل القيم المطلوبة ثم انقر على تحديث
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Total Income */}
            <div className="grid gap-2">
              <Label htmlFor="editTotalIncome">إجمالي الإيرادات</Label>
              <Input
                id="editTotalIncome"
                type="number"
                value={editTotalIncome}
                onChange={(e) => setEditTotalIncome(e.target.value)}
                placeholder="أدخل إجمالي الإيرادات"
              />
            </div>

            {/* Total Expenses */}
            <div className="grid gap-2">
              <Label htmlFor="editTotalExpenses">إجمالي المصروفات</Label>
              <Input
                id="editTotalExpenses"
                type="number"
                value={editTotalExpenses}
                onChange={(e) => setEditTotalExpenses(e.target.value)}
                placeholder="أدخل إجمالي المصروفات"
              />
            </div>

            {/* Net Profit (calculated) */}
            <div className="grid gap-2">
              <Label>صافي الربح</Label>
              <div
                className={`text-lg font-bold ${
                  editNetProfit >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatCurrencyEGP(editNetProfit)}
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="editNotes">ملاحظات</Label>
              <Textarea
                id="editNotes"
                placeholder="أضف ملاحظات (اختياري)"
                value={editNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateSummary} disabled={isUpdating}>
              {isUpdating ? "جارٍ التحديث..." : "تحديث"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف ملخص شهر {deletingSummary ? monthNames[deletingSummary.month] : ""} {deletingSummary?.year} نهائياً.
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSummary}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "جارٍ الحذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
