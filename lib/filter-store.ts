// Simple client-side store for filters
type FilterState = {
  location: string
  rewardRange: [number, number]
  dateFilter: string
  isActive: boolean
}

// Default filter state
const defaultFilters: FilterState = {
  location: "downtown",
  rewardRange: [0, 10000],
  dateFilter: "any",
  isActive: false,
}

// Get filters from localStorage
export const getFilters = (): FilterState => {
  if (typeof window === "undefined") return defaultFilters

  const stored = localStorage.getItem("post-filters")
  if (!stored) return defaultFilters

  try {
    return JSON.parse(stored)
  } catch (e) {
    console.error("Error parsing stored filters", e)
    return defaultFilters
  }
}

// Save filters to localStorage
export const saveFilters = (filters: FilterState): void => {
  if (typeof window === "undefined") return
  localStorage.setItem("post-filters", JSON.stringify(filters))
}

// Clear all filters
export const clearFilters = (): void => {
  if (typeof window === "undefined") return
  localStorage.setItem("post-filters", JSON.stringify({ ...defaultFilters, isActive: false }))
}

// Count active filters
export const countActiveFilters = (filters: FilterState): number => {
  let count = 0

  // Location filter (if not default)
  if (filters.location !== defaultFilters.location) count++

  // Reward range filter (if not default)
  if (
    filters.rewardRange[0] !== defaultFilters.rewardRange[0] ||
    filters.rewardRange[1] !== defaultFilters.rewardRange[1]
  )
    count++

  // Date filter (if not default)
  if (filters.dateFilter !== defaultFilters.dateFilter) count++

  return count
}
