"use client";

import { Building2 } from "lucide-react";
import { 
  translations, 
  getApartmentStatusArabic, 
  getPaymentStatusArabic, 
  formatCurrencyEGP 
} from "@/lib/i18n";

interface Apartment {
  _id: string;
  floor: number;
  unitNumber: string;
  unitLabel: string;
  status: "occupied" | "vacant" | "maintenance" | "reserved";
  rentAmount: number;
}

interface Payment {
  apartmentId: string;
  status: "paid" | "pending" | "late" | "partial";
}

interface BuildingGridProps {
  apartments: Apartment[];
  payments: Payment[];
}

export function BuildingGrid({ apartments, payments }: BuildingGridProps) {
  // Calculate maximum floor dynamically from apartments array
  const maxFloor = apartments.length > 0 
    ? Math.max(...apartments.map(a => a.floor))
    : 6; // Default to 6 if no apartments
  
  // Generate floors array dynamically based on actual data
  const floors = Array.from({ length: maxFloor }, (_, i) => i + 1);

  const getPaymentStatus = (apartmentId: string): string => {
    const payment = payments.find((p) => p.apartmentId === apartmentId);
    return payment?.status || "none";
  };

  const getStatusColor = (apartmentStatus: string, paymentStatus: string) => {
    // If apartment is vacant, in maintenance, or reserved, show that status
    if (apartmentStatus === "vacant") return "bg-gray-400";
    if (apartmentStatus === "maintenance") return "bg-blue-500";
    if (apartmentStatus === "reserved") return "bg-orange-500";

    // If occupied, show payment status
    switch (paymentStatus) {
      case "paid":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "late":
        return "bg-red-500";
      case "partial":
        return "bg-purple-500";
      default:
        return "bg-gray-300";
    }
  };

  const getStatusText = (apartmentStatus: string, paymentStatus: string): string => {
    // First check apartment status
    if (apartmentStatus === "vacant") return getApartmentStatusArabic("vacant");
    if (apartmentStatus === "maintenance") return getApartmentStatusArabic("maintenance");
    if (apartmentStatus === "reserved") return getApartmentStatusArabic("reserved");

    // Then check payment status for occupied apartments
    return getPaymentStatusArabic(paymentStatus);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" />
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{translations.buildingOverview}</h2>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {floors.map((floor) => {
          const floorApartments = apartments
            .filter((a) => a.floor === floor)
            .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, 'ar'));

          return (
            <div key={floor} className="flex items-start sm:items-center gap-2 sm:gap-4">
              <div className="w-12 sm:w-16 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 text-end flex-shrink-0 pt-2 sm:pt-0">
                {translations.floor} {floor}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {floorApartments.length > 0 ? (
                  floorApartments.map((apartment) => {
                    const paymentStatus = getPaymentStatus(apartment._id);
                    const colorClass = getStatusColor(apartment.status, paymentStatus);
                    const statusText = getStatusText(apartment.status, paymentStatus);

                    return (
                      <div
                        key={apartment._id}
                        className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div
                            className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${colorClass}`}
                          />
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                              {apartment.unitLabel}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatCurrencyEGP(apartment.rentAmount)}{translations.perMonth}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {statusText}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-1 sm:col-span-2 text-center text-gray-400 dark:text-gray-500 text-xs sm:text-sm py-2">
                    لا توجد شقق في هذا الدور
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">{translations.legend}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600 dark:text-gray-300">{translations.paid}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-gray-600 dark:text-gray-300">{translations.pending}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-600 dark:text-gray-300">{translations.late}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-purple-500" />
            <span className="text-xs text-gray-600 dark:text-gray-300">{translations.partial}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-300">{translations.vacant}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-600 dark:text-gray-300">{translations.maintenanceStatus}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-orange-500" />
            <span className="text-xs text-gray-600 dark:text-gray-300">{translations.reserved}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
