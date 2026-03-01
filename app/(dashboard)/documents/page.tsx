"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, Upload, Download, Trash2, MoreHorizontal, FolderOpen, Plus, File, Pencil } from "lucide-react";
import { useToast } from "@/lib/toast";

interface Document {
  _id: Id<"documents">;
  title: string;
  type: string;
  fileId: Id<"_storage">;
  fileUrl?: string | null;
  uploadDate: number;
  notes?: string;
  createdAt: number;
}

const documentTypes = [
  { value: "فاتورة مياه", label: "فاتورة مياه" },
  { value: "فاتورة كهرباء", label: "فاتورة كهرباء" },
  { value: "فاتورة غاز", label: "فاتورة غاز" },
  { value: "ملكية", label: "ملكية العقار" },
  { value: "عقد", label: "عقد" },
  { value: "ترخيص", label: "ترخيص" },
  { value: "أخرى", label: "أخرى" },
];

export default function DocumentsPage() {
  const documents = useQuery(api.documents.getDocuments);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const saveDocument = useMutation(api.documents.saveDocument);
  const updateDocument = useMutation(api.documents.updateDocument);
  const deleteDocument = useMutation(api.documents.deleteDocument);
  const { addToast } = useToast();

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Edit state
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [deleteDocumentId, setDeleteDocumentId] = useState<Id<"documents"> | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill title from filename if empty
      if (!title) {
        const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setTitle(fileName);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title || !type) {
      addToast("يرجى ملء جميع الحقول المطلوبة", "error");
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > MAX_FILE_SIZE) {
      addToast("حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)", "error");
      return;
    }

    setIsUploading(true);
    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl({});

      // Step 2: Upload file to the URL
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!result.ok) {
        throw new Error("Failed to upload file");
      }

      // Get the storage ID from response body (newer Convex versions)
      const responseText = await result.text();
      let storageId: string | null = null;
      
      // Try header first (older Convex versions)
      const headerStorageId = result.headers.get("x-convex-stor-id");
      if (headerStorageId) {
        storageId = headerStorageId;
      } else {
        // Try parsing from body (newer Convex versions)
        try {
          const responseJson = JSON.parse(responseText);
          storageId = responseJson.storageId || null;
        } catch (e) {
          console.error("Failed to parse response:", responseText);
        }
      }

      if (!storageId) {
        throw new Error("Failed to get storage ID");
      }

      // Step 3: Save document metadata
      await saveDocument({
        title,
        type,
        fileId: storageId as Id<"_storage">,
        notes: notes || undefined,
      });

      addToast("تم رفع الوثيقة بنجاح", "success");
      
      // Reset form
      setIsUploadDialogOpen(false);
      setTitle("");
      setType("");
      setNotes("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      addToast("حدث خطأ في رفع الوثيقة", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDocumentId) return;

    setIsDeleting(true);
    try {
      await deleteDocument({ id: deleteDocumentId });
      addToast("تم حذف الوثيقة بنجاح", "success");
      setIsDeleteDialogOpen(false);
      setDeleteDocumentId(null);
    } catch (error) {
      console.error("Error deleting document:", error);
      addToast("حدث خطأ في حذف الوثيقة", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (docId: Id<"documents">) => {
    setDeleteDocumentId(docId);
    setIsDeleteDialogOpen(true);
  };

  const openEditDialog = (doc: Document) => {
    setEditingDocument(doc);
    setEditTitle(doc.title);
    setEditType(doc.type);
    setEditNotes(doc.notes || "");
    setEditSelectedFile(null);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingDocument || !editTitle || !editType) {
      addToast("يرجى ملء جميع الحقول المطلوبة", "error");
      return;
    }

    // Check file size if new file selected
    if (editSelectedFile) {
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (editSelectedFile.size > MAX_FILE_SIZE) {
        addToast("حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)", "error");
        return;
      }
    }

    setIsUpdating(true);
    try {
      let newFileId: string | undefined = undefined;
      
      // Upload new file if selected
      if (editSelectedFile) {
        const uploadUrl = await generateUploadUrl({});
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": editSelectedFile.type },
          body: editSelectedFile,
        });

        if (!result.ok) {
          throw new Error("Failed to upload file");
        }

        // Get storage ID from response
        const responseText = await result.text();
        let storageId: string | null = null;
        const headerStorageId = result.headers.get("x-convex-stor-id");
        if (headerStorageId) {
          storageId = headerStorageId;
        } else {
          try {
            const responseJson = JSON.parse(responseText);
            storageId = responseJson.storageId || null;
          } catch (e) {
            console.error("Failed to parse response:", responseText);
          }
        }

        if (!storageId) {
          throw new Error("Failed to get storage ID");
        }
        
        newFileId = storageId;
      }

      await updateDocument({
        id: editingDocument._id,
        title: editTitle,
        type: editType,
        notes: editNotes || undefined,
        fileId: newFileId,
      });
      addToast("تم تحديث الوثيقة بنجاح", "success");
      setIsEditDialogOpen(false);
      setEditingDocument(null);
      setEditTitle("");
      setEditType("");
      setEditNotes("");
      setEditSelectedFile(null);
    } catch (error) {
      console.error("Error updating document:", error);
      addToast("حدث خطأ في تحديث الوثيقة", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes("مياه") || type.includes("كهرباء") || type.includes("غاز")) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    if (type.includes("ملكية")) {
      return <File className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="container mx-auto p-6 pt-20 lg:pt-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">إدارة الوثائق</h1>
            <p className="text-muted-foreground text-sm">قم برفع وعرض وثائق المبنى</p>
          </div>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة وثيقة
        </Button>
      </div>

      {/* Documents Table */}
      {documents && documents.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>الوثائق ({documents.length})</CardTitle>
            <CardDescription>
              جميع الوثائق المرفوعة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">نوع الوثيقة</TableHead>
                    <TableHead className="text-right">العنوان</TableHead>
                    <TableHead className="text-right">تاريخ الرفع</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                    <TableHead className="text-center w-[100px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc: Document) => (
                    <TableRow key={doc._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.type)}
                          <span>{doc.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>
                        {new Date(doc.uploadDate).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {doc.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                            >
                              <Button variant="ghost" size="icon">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditDialog(doc)}
                                className="cursor-pointer"
                              >
                                <Pencil className="h-4 w-4 ml-2" />
                                تعديل
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(doc._id)}
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
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
          <FolderOpen className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">لا توجد وثائق</p>
          <p className="text-sm">قم بإضافة أول وثيقة من الزر أعلاه</p>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>إضافة وثيقة جديدة</DialogTitle>
            <DialogDescription>
             قم برفع ملف PDF أو صورة للوثيقة
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* File Input */}
            <div className="grid gap-2">
              <Label>الملف</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    {selectedFile ? (
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        انقر لرفع ملف أو اسحب الملف هنا
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">عنوان الوثيقة</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="أدخل عنوان الوثيقة"
              />
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">نوع الوثيقة</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="اختر نوع الوثيقة" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((docType) => (
                    <SelectItem key={docType.value} value={docType.value}>
                      {docType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أضف ملاحظات (اختياري)"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpload} disabled={isUploading || !selectedFile}>
              {isUploading ? "جارٍ الرفع..." : "رفع الوثيقة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>تعديل الوثيقة</DialogTitle>
            <DialogDescription>
              قم بتعديل معلومات الوثيقة
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="editTitle">عنوان الوثيقة</Label>
              <Input
                id="editTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="أدخل عنوان الوثيقة"
              />
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="editType">نوع الوثيقة</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger id="editType">
                  <SelectValue placeholder="اختر نوع الوثيقة" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((docType) => (
                    <SelectItem key={docType.value} value={docType.value}>
                      {docType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="editNotes">ملاحظات</Label>
              <Textarea
                id="editNotes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="أضف ملاحظات (اختياري)"
                rows={3}
              />
            </div>

            {/* File Input - Optional */}
            <div className="grid gap-2">
              <Label>ملف جديد (اختياري)</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={(e) => setEditSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="edit-file-upload"
                />
                <label htmlFor="edit-file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    {editSelectedFile ? (
                      <div>
                        <p className="font-medium">{editSelectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(editSelectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        انقر لاستبدال الملف الحالي
                      </p>
                    )}
                  </div>
                </label>
                {editSelectedFile && (
                  <button
                    type="button"
                    onClick={() => setEditSelectedFile(null)}
                    className="text-xs text-red-500 mt-2 hover:underline"
                  >
                    إزالة الملف المحدد
                  </button>
                )}
              </div>
              {editingDocument && !editSelectedFile && (
                <p className="text-xs text-muted-foreground">
                  الملف الحالي: سيتم الاحتفاظ به ما لم تختر ملفاً جديداً
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating || !editTitle || !editType}>
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
              سيتم حذف هذه الوثيقة نهائياً. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
