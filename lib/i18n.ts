/**
 * Internationalization (i18n) utilities for Arabic localization
 */

// UI Translations
export const translations = {
  // Navigation
  dashboard: "لوحة التحكم",
  apartments: "الشقق",
  tenants: "المستأجرين",
  payments: "الدفعات",
  invoices: "الفواتير",
  maintenanceNav: "الصيانة",
  buildingManager: "مدير المباني",

  // KPI Cards
  totalRevenue: "إجمالي الإيرادات",
  totalMonthlyRevenue: "إجمالي الإيرادات الشهرية",
  collectedAmount: "المبالغ المحصلة",
  outstandingBalance: "المبالغ المتأخرة",
  occupancyRate: "نسبة الإشغال",
  allUnits: "جميع الوحدات",
  paymentsCount: "دفعة",
  paymentsCountPlural: "دفعات",
  pendingPayments: "دفعة معلقة",
  pendingPaymentsPlural: "دفعات معلقة",
  unitsCount: "وحدة",
  unitsCountPlural: "وحدات",

  // Alerts
  paymentAlert: "تنبيه الدفع",
  latePayments: "دفعة متأخرة",
  latePaymentsPlural: "دفعات متأخرة",
  latePaymentFollowUp: "دفعات متأخرة - المتابعة الفورية مطلوبة",
  pendingPaymentsAwaiting: "دفعة قيد الانتظار",
  pendingPaymentsAwaitingPlural: "دفعات قيد الانتظار تنتظر التحصيل",

  // Building Grid
  buildingOverview: "نظرة عامة على المبنى",
  floor: "الدور",
  perMonth: "/شهر",
  noPayment: "بدون دفع",

  // Legend
  legend: "وسيلة الإيضاح",
  paid: "مدفوع",
  pending: "قيد الانتظار",
  late: "متأخر",
  partial: "دفع جزئي",
  vacant: "شاغرة",
  maintenanceStatus: "صيانة",

  // Status
  occupied: "مأجور",

  // Loading
  loading: "جاري التحميل...",

  // Overview
  overviewTitle: "نظرة عامة على أداء المبنى هذا الشهر",
};

// Apartment Status Translations (mapped from English DB values to Arabic)
export const apartmentStatusTranslations: Record<string, string> = {
  occupied: "مأجورة",
  vacant: "شاغرة",
  maintenance: "صيانة",
};

// Payment Status Translations (mapped from English DB values to Arabic)
export const paymentStatusTranslations: Record<string, string> = {
  paid: "مدفوع",
  pending: "قيد الانتظار",
  late: "متأخر",
  partial: "دفع جزئي",
  none: "بدون دفع",
};

/**
 * Get Arabic translation for apartment status
 */
export function getApartmentStatusArabic(status: string): string {
  return apartmentStatusTranslations[status] || status;
}

/**
 * Get Arabic translation for payment status
 */
export function getPaymentStatusArabic(status: string): string {
  return paymentStatusTranslations[status] || status;
}

/**
 * Format currency to Egyptian Pound (ج.م)
 */
export function formatCurrencyEGP(amount: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date to Arabic format
 */
export function formatDateArabic(timestamp: number): string {
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

/**
 * Format date to short Arabic format
 */
export function formatDateShortArabic(timestamp: number): string {
  return new Intl.DateTimeFormat("ar-EG", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

/**
 * Get pluralized Arabic word for count - FIXED: proper dual form handling
 * 
 * Arabic has three forms:
 * - Singular (المفرد): count = 1
 * - Dual (المثنى): count = 2
 * - Plural (الجمع): count > 2
 */
export function getArabicPlural(
  count: number, 
  singular: string, 
  plural: string,
  dual?: string // Optional custom dual form
): string {
  if (count === 1) {
    return singular;
  }
  if (count === 2) {
    // Use custom dual if provided, otherwise use singular + "ان" for most nouns
    // This is a simplified dual form - for proper Arabic, you would use specific dual forms
    return dual || `${singular}ان`;
  }
  return plural;
}

// Common Arabic dual forms for apartments/units
export const dualForms = {
  apartment: "شقتان",
  unit: "وحدتان",
  payment: "دفعتان",
  tenant: "مستأجران",
  // Add more as needed
};
