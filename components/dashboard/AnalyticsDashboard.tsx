"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { KPICard } from "@/components/dashboard/KPICard";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip 
} from "recharts";
import { Building2, TrendingUp, Home, DollarSign } from "lucide-react";
import { formatCurrencyEGP } from "@/lib/i18n";

// Chart colors
const COLORS = {
  occupied: "#22c55e", // Green
  vacant: "#ef4444",    // Red
};

interface DashboardStats {
  totalApartments: number;
  occupiedApartments: number;
  vacantApartments: number;
  occupancyRate: number;
  totalMonthlyRent: number;
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm animate-pulse">
      <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
      <div className="h-64 flex items-center justify-center">
        <div className="h-48 w-48 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  const stats = useQuery(api.apartments.getDashboardStats) as DashboardStats | null;

  // Loading state
  if (!stats) {
    return (
      <div className="space-y-6">
        {/* Skeleton Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        
        {/* Skeleton Chart */}
        <SkeletonChart />
      </div>
    );
  }

  // Prepare chart data
  const chartData = [
    { 
      name: "Occupied", 
      value: stats.occupiedApartments,
      color: COLORS.occupied 
    },
    { 
      name: "Vacant", 
      value: stats.vacantApartments,
      color: COLORS.vacant 
    },
  ];

  // Filter out empty values for the chart
  const activeChartData = chartData.filter(d => d.value > 0);

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-md">
          <p className="font-medium text-gray-900 dark:text-white">
            {data.name}: <span className="text-primary">{data.value}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round((data.value / stats.totalApartments) * 100)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Apartments"
          value={stats.totalApartments}
          icon={Building2}
          subtitle={`${stats.occupiedApartments + stats.vacantApartments} units`}
        />
        
        <KPICard
          title="Occupancy Rate"
          value={`${stats.occupancyRate}%`}
          icon={TrendingUp}
          trend={
            stats.occupancyRate >= 80 
              ? { value: stats.occupancyRate - 50, isPositive: true }
              : stats.occupancyRate >= 50 
                ? { value: 30, isPositive: false }
                : { value: 50, isPositive: false }
          }
        />
        
        <KPICard
          title="Vacant"
          value={stats.vacantApartments}
          icon={Home}
          subtitle={stats.vacantApartments === 0 ? "All units occupied" : `${stats.vacantApartments} units available`}
        />
        
        <KPICard
          title="Total Expected Revenue"
          value={formatCurrencyEGP(stats.totalMonthlyRent)}
          icon={DollarSign}
          subtitle="Per month"
        />
      </div>

      {/* Pie Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Occupancy Overview
        </h3>
        
        <div className="h-64">
          {stats.totalApartments === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No apartments data available</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => 
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  labelLine={true}
                >
                  {activeChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => (
                    <span className="text-gray-700 dark:text-gray-300">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
