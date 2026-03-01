"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AlertTriangle, Building, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ExpiringTenant {
  _id: Id<"tenants">;
  name: string;
  leaseEndDate: number;
  apartment: {
    _id: Id<"apartments">;
    unitLabel: string;
    floor: number;
  } | null;
}

export function ExpiringLeasesAlert() {
  // Get tenants with leases expiring in the next 30 days
  const expiringLeases = useQuery(api.tenants.getExpiringLeases, { daysAhead: 30 }) as ExpiringTenant[] | undefined;

  if (!expiringLeases || expiringLeases.length === 0) {
    return null;
  }

  // Sort by lease end date (soonest first)
  const sortedLeases = [...expiringLeases].sort((a, b) => a.leaseEndDate - b.leaseEndDate);

  const getDaysRemaining = (endDate: number) => {
    const now = Date.now();
    const days = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 7) return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    if (days <= 14) return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
    return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
  };

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <h3 className="font-semibold text-amber-900 dark:text-amber-200">
          عقود تنتهي قريباً ({expiringLeases.length})
        </h3>
      </div>
      
      <div className="space-y-2">
        {sortedLeases.slice(0, 3).map((tenant) => {
          const daysRemaining = getDaysRemaining(tenant.leaseEndDate);
          const urgencyClass = getUrgencyColor(daysRemaining);
          
          return (
            <div
              key={tenant._id}
              className={`flex items-center justify-between p-3 rounded-md border ${urgencyClass}`}
            >
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 opacity-70" />
                <div>
                  <p className="font-medium text-sm">
                    {tenant.apartment?.unitLabel || "Unknown Unit"}
                  </p>
                  <p className="text-xs opacity-80">{tenant.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3 w-3 opacity-70" />
                <span>
                  {daysRemaining === 0
                    ? "اليوم"
                    : daysRemaining === 1
                    ? "غداً"
                    : `${daysRemaining} أيام`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {expiringLeases.length > 3 && (
        <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            +{expiringLeases.length - 3} more contracts expiring soon
          </p>
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <Link href="/tenants?filter=expiring">
          <Button variant="outline" size="sm" className="gap-2">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
