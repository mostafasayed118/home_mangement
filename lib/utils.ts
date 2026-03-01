/**
 * Utility functions for the Building Management Dashboard
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge tailwind classes with cn utility
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency to EGP (Egyptian Pound)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
  }).format(amount);
}

/**
 * Format date to readable string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format date to short format
 */
export function formatDateShort(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Get month name from number
 */
export function getMonthName(month: number): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1];
}

/**
 * Get current month and year
 */
export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

/**
 * Calculate days until a date
 */
export function daysUntil(timestamp: number): number {
  const now = Date.now();
  const diff = timestamp - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get status color based on payment status
 */
export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case "paid":
      return "bg-green-500";
    case "pending":
      return "bg-yellow-500";
    case "late":
      return "bg-red-500";
    case "partial":
      return "bg-purple-500";
    default:
      return "bg-gray-500";
  }
}

/**
 * Get apartment status color
 */
export function getApartmentStatusColor(status: string): string {
  switch (status) {
    case "occupied":
      return "bg-green-500";
    case "vacant":
      return "bg-gray-500";
    case "maintenance":
      return "bg-blue-500";
    case "reserved":
      return "bg-orange-500";
    default:
      return "bg-gray-500";
  }
}

/**
 * Get maintenance status color
 */
export function getMaintenanceStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "bg-yellow-500";
    case "in_progress":
      return "bg-blue-500";
    case "done":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
}
