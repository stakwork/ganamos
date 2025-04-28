import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSatsValue(value: number | null | undefined): string {
  // Handle null or undefined values
  if (value === null || value === undefined) {
    return "0 sats"
  }

  // For values less than 1000, just return the number with "sats"
  if (value < 1000) {
    return `${value} sats`
  }

  // For values 1000 or greater, format with "k"
  const valueInK = value / 1000

  // Check if it's a whole number in thousands (e.g., 1.0k)
  if (valueInK === Math.floor(valueInK)) {
    return `${Math.floor(valueInK)}k sats`
  }

  // Otherwise, show one decimal place
  return `${valueInK.toFixed(1)}k sats`
}
