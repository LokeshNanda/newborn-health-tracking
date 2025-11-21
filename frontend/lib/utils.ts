import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (value: string | Date, options?: Intl.DateTimeFormatOptions) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", options ?? { month: "short", day: "numeric", year: "numeric" }).format(
    date,
  );
};

export const formatDateTime = (value: string | Date) =>
  formatDate(value, { month: "short", day: "numeric", hour: "numeric", minute: "numeric" });

export const formatAge = (dob: string, reference: Date = new Date()) => {
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) {
    return "Unknown";
  }

  let years = reference.getFullYear() - birthDate.getFullYear();
  let months = reference.getMonth() - birthDate.getMonth();
  let days = reference.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(reference.getFullYear(), reference.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0 || years > 0) parts.push(`${months}m`);
  parts.push(`${days}d`);
  return parts.join(" ");
};
