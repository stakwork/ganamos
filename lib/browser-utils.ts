// Utility to check if code is running in browser
export const isBrowser = typeof window !== "undefined"

// Safe localStorage wrapper
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (isBrowser) {
      return localStorage.getItem(key)
    }
    return null
  },
  setItem: (key: string, value: string): void => {
    if (isBrowser) {
      localStorage.setItem(key, value)
    }
  },
  removeItem: (key: string): void => {
    if (isBrowser) {
      localStorage.removeItem(key)
    }
  },
}

// Safe window access
export const safeWindow = {
  location: {
    href: isBrowser ? window.location.href : "",
    origin: isBrowser ? window.location.origin : "",
    pathname: isBrowser ? window.location.pathname : "",
    search: isBrowser ? window.location.search : "",
    hash: isBrowser ? window.location.hash : "",
  },
  history: {
    pushState: (data: any, unused: string, url?: string | URL | null): void => {
      if (isBrowser) {
        window.history.pushState(data, unused, url)
      }
    },
    replaceState: (data: any, unused: string, url?: string | URL | null): void => {
      if (isBrowser) {
        window.history.replaceState(data, unused, url)
      }
    },
  },
}
