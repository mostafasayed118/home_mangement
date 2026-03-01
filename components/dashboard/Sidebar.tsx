"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Wrench,
  FileText,
  Menu,
  X,
  LogOut,
  User,
  BarChart,
} from "lucide-react";
import { translations } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: translations.dashboard, href: "/", icon: LayoutDashboard },
  { name: translations.apartments, href: "/apartments", icon: Building2 },
  { name: translations.tenants, href: "/tenants", icon: Users },
  { name: translations.payments, href: "/payments", icon: CreditCard },
  { name: translations.invoices, href: "/invoices", icon: FileText },
  { name: translations.maintenanceNav, href: "/maintenance", icon: Wrench },
  { name: translations.summaries, href: "/summaries", icon: BarChart },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut, isAuthenticated } = useAuth();

  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between bg-gray-900 dark:bg-gray-950 px-4 border-b border-gray-800 dark:border-gray-700">
        <h1 className="text-lg font-bold text-white">{translations.buildingManager}</h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-400 hover:text-white p-2"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex h-screen w-64 flex-col bg-gray-900 dark:bg-gray-950
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo - Hidden on mobile (shown in mobile header instead) */}
        <div className="hidden lg:flex h-16 items-center justify-center border-b border-gray-800 dark:border-gray-700">
          <h1 className="text-xl font-bold text-white">{translations.buildingManager}</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 mt-16 lg:mt-0">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-800 text-white dark:bg-gray-700"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white dark:hover:bg-gray-800"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        {isAuthenticated && user && (
          <div className="border-t border-gray-800 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-700">
                <User className="h-4 w-4 text-gray-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name || "Admin"}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <LogOut className="h-4 w-4 ml-2" />
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
