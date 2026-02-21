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
  status: "occupied" | "vacant" | "maintenance";
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
    // If apartment is vacant or in maintenance, show that status
    if (apartmentStatus === "vacant") return "bg-gray-400";
    if (apartmentStatus === "maintenance") return "bg-blue-500";

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

    // Then check payment status for occupied apartments
    return getPaymentStatusArabic(paymentStatus);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="h-5 w-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">{translations.buildingOverview}</h2>
      </div>

      <div className="space-y-4">
        {floors.map((floor) => {
          const floorApartments = apartments
            .filter((a) => a.floor === floor)
            .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, 'ar'));

          return (
            <div key={floor} className="flex items-center gap-4">
              <div className="w-16 text-sm font-medium text-gray-500 text-end">
                {translations.floor} {floor}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                {floorApartments.length > 0 ? (
                  floorApartments.map((apartment) => {
                    const paymentStatus = getPaymentStatus(apartment._id);
                    const colorClass = getStatusColor(apartment.status, paymentStatus);
                    const statusText = getStatusText(apartment.status, paymentStatus);

                    return (
                      <div
                        key={apartment._id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-3 w-3 rounded-full ${colorClass}`}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {apartment.unitLabel}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatCurrencyEGP(apartment.rentAmount)}{translations.perMonth}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-gray-600">
                          {statusText}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-center text-gray-400 text-sm py-2">
                    لا توجد شقق في هذا الدور
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs font-medium text-gray-500 mb-3">{translations.legend}</p>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600">{translations.paid}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-gray-600">{translations.pending}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-600">{translations.late}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-purple-500" />
            <span className="text-xs text-gray-600">{translations.partial}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gray-400" />
            <span className="text-xs text-gray-600">{translations.vacant}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-600">{translations.maintenanceStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
