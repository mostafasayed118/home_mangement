"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ContractPdfGeneratorProps {
  tenantName: string;
  apartmentNumber: string;
  rentAmount: number;
  startDate: number; // timestamp
  endDate: number; // timestamp
  landlordName?: string;
  landlordPhone?: string;
}

export function ContractPdfGenerator({
  tenantName,
  apartmentNumber,
  rentAmount,
  startDate,
  endDate,
  landlordName = "المؤجر",
  landlordPhone = "0123456789",
}: ContractPdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
    }).format(amount);
  };

  const generatePdf = async () => {
    setIsGenerating(true);

    try {
      // Create new PDF document (A4 size)
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Set RTL direction for Arabic text
      // Note: jsPDF doesn't natively support RTL, so we'll use right-aligned text

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let y = margin;

      // Helper function to add centered text
      const addCenteredText = (text: string, fontSize: number, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        const textWidth = doc.getTextWidth(text);
        const x = (pageWidth - textWidth) / 2;
        doc.text(text, x, y);
        y += fontSize / 3 + 2;
      };

      // Helper function to add right-aligned text
      const addRightAlignedText = (text: string, fontSize: number, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        doc.text(text, pageWidth - margin, y, { align: "right" });
        y += fontSize / 3 + 2;
      };

      // Helper function to add justified paragraph
      const addParagraph = (text: string, fontSize: number = 11) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(text, contentWidth);
        doc.text(lines, margin, y, { align: "right" });
        y += (lines.length * fontSize / 3) + 4;
      };

      // Header - Contract Title
      addCenteredText("عقد إيجار وحدات سكنية", 18, true);
      y += 5;

      // Contract number and date
      addRightAlignedText(`رقم العقد: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`, 10);
      addRightAlignedText(`تاريخ العقد: ${formatDate(Date.now())}`, 10);
      y += 10;

      // Parties
      addRightAlignedText("بين:", 12);
      y += 3;

      addRightAlignedText(`الطرف الأول (المؤجر): ${landlordName}`, 12, true);
      addRightAlignedText(`رقم الهاتف: ${landlordPhone}`, 10);
      y += 5;

      addRightAlignedText(`الطرف الثاني (المستأجر): ${tenantName}`, 12, true);
      y += 5;

      // Property details
      addRightAlignedText("بشأن:", 12);
      y += 3;
      addRightAlignedText(`وحدة سكنية رقم: ${apartmentNumber}`, 11, true);
      y += 8;

      // Lease terms
      addRightAlignedText("شروط العقد:", 14, true);
      y += 5;

      // Duration
      addParagraph(
        `تم إبرام هذا العقد لفترة محددة تبدأ من تاريخ ${formatDate(startDate)} وتنتهي في ${formatDate(endDate)}، وذلك لمدة محددة وفقًا لما هو مذكور أعلاه.`
      );

      // Rent amount
      addParagraph(
        `يلتزم المستأجر بدفع إيجار شهري قدره ${formatCurrency(rentAmount)} (فقط ${rentAmount} جنيه مصري لا غير) payable في أول كل شهر ميلادي.`
      );

      // Payment terms
      addParagraph(
        "في حالة التأخر في سداد الإيجار لمدة تزيد عن خمسة أيام من تاريخ الاستحقاق، يحق للمؤجر إضافة غرامة تأخير قدرها 2% من قيمة الإيجار الشهري عن كل يوم تأخير."
      );

      // Security deposit
      addParagraph(
        `يجب على المستأجر دفع عربيونSecurity deposit equal to one month's rent as a guarantee. This deposit will be refunded at the end of the lease period after deducting any damages or unpaid dues.`
      );

      // Maintenance
      addParagraph(
        "يتحمل المستأجر تكاليف الصيانةMinor repairs التي تنشأ من سوء الاستخدام، أما الصيانةMajor structural repairs فتتحملها المالك."
      );

      // Termination terms
      addParagraph(
        "في حالة رغبة أي من الطرفين في إنهاء العقد قبل انتهاء مدته، يجب إخطار الطرف الآخر كتابيًا قبل ذلك بشهر واحد على الأقل."
      );

      // Signature section
      y += 15;
      addCenteredText("التوقيعات", 14, true);
      y += 15;

      // Signature boxes
      const boxWidth = contentWidth / 2 - 5;
      const boxHeight = 25;

      // Landlord signature (left)
      doc.rect(margin, y, boxWidth, boxHeight);
      doc.setFontSize(10);
      doc.text("توقيع المؤجر", margin + boxWidth / 2, y + boxHeight / 2, { align: "center" });

      // Tenant signature (right)
      doc.rect(margin + boxWidth + 10, y, boxWidth, boxHeight);
      doc.text("توقيع المستأجر", margin + boxWidth + 10 + boxWidth / 2, y + boxHeight / 2, { align: "center" });

      // Footer
      y = pageHeight - 15;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        "تم إنشاء هذا العقد إلكترونيًا - نظام إدارة المباني",
        pageWidth / 2,
        y,
        { align: "center" }
      );

      // Save the PDF
      const fileName = `contract_${tenantName.replace(/\s+/g, "_")}_${apartmentNumber}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={generatePdf}
      disabled={isGenerating}
      variant="outline"
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      {isGenerating ? "جاري إنشاء العقد..." : "تحميل عقد الإيجار"}
    </Button>
  );
}
