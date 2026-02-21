"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { KPICard } from "@/components/dashboard/KPICard";
import { BuildingGrid } from "@/components/dashboard/BuildingGrid";
import { DollarSign, TrendingUp, TrendingDown, Home, AlertCircle } from "lucide-react";
import { formatCurrencyEGP, translations, getArabicPlural } from "@/lib/i18n";

export default function DashboardPage() {
  // Fetch building stats
  const stats = useQuery(api.payments.getBuildingStats);
  const apartments = useQuery(api.apartments.getAll);
  const payments = useQuery(api.payments.getCurrentMonth);

  // Loading state
  if (!stats || !apartments || !payments) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const pendingCount = stats.pendingCount + stats.lateCount + stats.partialCount;
  const paymentsText = getArabicPlural(stats.paidCount, translations.paymentsCount, translations.paymentsCountPlural);
  const pendingText = getArabicPlural(pendingCount, translations.pendingPayments, translations.pendingPaymentsPlural);
  const unitsText = getArabicPlural(stats.totalUnits, translations.unitsCount, translations.unitsCountPlural);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{translations.dashboard}</h1>
          <p className="text-gray-500 mt-2">
            {translations.overviewTitle}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title={translations.totalMonthlyRevenue}
            value={formatCurrencyEGP(stats.totalMonthlyRent)}
            icon={DollarSign}
            subtitle={translations.allUnits}
          />
          <KPICard
            title={translations.collectedAmount}
            value={formatCurrencyEGP(stats.collected)}
            icon={TrendingUp}
            subtitle={`${stats.paidCount} ${paymentsText}`}
          />
          <KPICard
            title={translations.outstandingBalance}
            value={formatCurrencyEGP(stats.outstanding)}
            icon={TrendingDown}
            subtitle={`${pendingCount} ${pendingText}`}
          />
          <KPICard
            title={translations.occupancyRate}
            value={`${stats.occupancyRate.toFixed(1)}%`}
            icon={Home}
            subtitle={`${stats.occupiedCount}/${stats.totalUnits} ${unitsText}`}
          />
        </div>

        {/* Alerts Section */}
        {(stats.lateCount > 0 || stats.pendingCount > 0) && (
          <div className="mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-yellow-800">{translations.paymentAlert}</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {stats.lateCount > 0 && `${stats.lateCount} ${getArabicPlural(stats.lateCount, translations.latePayments, translations.latePaymentsPlural)} - ${translations.latePaymentFollowUp}`}
                  {stats.lateCount > 0 && stats.pendingCount > 0 && "، "}
                  {stats.pendingCount > 0 && `${stats.pendingCount} ${getArabicPlural(stats.pendingCount, translations.pendingPaymentsAwaiting, translations.pendingPaymentsAwaitingPlural)}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Building Grid */}
        <BuildingGrid apartments={apartments} payments={payments} />
      </div>
    </div>
  );
}
