import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** "YYYY-MM-DD" in the user's local time zone (toISOString would use UTC and be a day off before 8 AM in the Philippines). */
export function localISODate(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
