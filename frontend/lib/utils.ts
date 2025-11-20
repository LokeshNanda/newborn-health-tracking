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
