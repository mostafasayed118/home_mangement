"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Wrench,
} from "lucide-react";
import { translations } from "@/lib/i18n";

const navigation = [
  { name: translations.dashboard, href: "/", icon: LayoutDashboard },
  { name: translations.apartments, href: "/apartments", icon: Building2 },
  { name: translations.tenants, href: "/tenants", icon: Users },
  { name: translations.payments, href: "/payments", icon: CreditCard },
  { name: translations.maintenanceNav, href: "/maintenance", icon: Wrench },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">{translations.buildingManager}</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
