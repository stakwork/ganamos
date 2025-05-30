import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSatsValue(sats: number): string {
  if (sats >= 1000000) {
    return `${(sats / 1000000).toFixed(1)}M sats`
  } else if (sats >= 1000) {
    return `${(sats / 1000).toFixed(1)}k sats`
  } else {
    return `${sats} sats`
  }
}

export function formatTimeAgo(date: Date): string {
  const formatted = formatDistanceToNow(date, { addSuffix: true })

  return formatted
    .replace(/about /g, "") // Remove "about"
    .replace(/ hours?/g, " hrs") // Replace "hour" or "hours" with "hrs"
    .replace(/ minutes?/g, " mins") // Replace "minute" or "minutes" with "mins"
}
