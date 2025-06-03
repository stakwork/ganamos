// Simple UUID generator that doesn't require external dependencies
export function generateUUID(): string {
  // This implementation creates a UUID v4 format string
  // It's not cryptographically secure but works for most use cases
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Export the function as default for backward compatibility
export default generateUUID
