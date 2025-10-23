'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-2xl">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-6">
                {/* Error Icon */}
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-red-600 dark:text-red-300"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" x2="12" y1="8" y2="12" />
                    <line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                </div>

                {/* Error Message */}
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Oops! Something went wrong
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed px-4">
                    Don't worry, this happens sometimes. Try refreshing the page to get back on track.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={() => window.location.reload()}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
                    size="lg"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2"
                    >
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                    Refresh Page
                  </Button>
                  
                  <Button
                    onClick={() => reset()}
                    variant="outline"
                    className="w-full py-6 rounded-lg"
                    size="lg"
                  >
                    Try Again
                  </Button>
                </div>

                {/* Help Text */}
                <p className="text-xs text-gray-500 dark:text-gray-400 pt-4">
                  If this problem persists, please contact support
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}

