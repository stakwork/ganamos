export function LandingHero() {
  return (
    <div className="flex flex-col items-center text-center pt-16">
      <h1 className="app-title mb-4">Ganamos!</h1>
      <p className="mt-2 text-lg text-muted-foreground font-medium bg-white/50 dark:bg-gray-900/50 px-3 py-1 rounded-full flex items-center justify-center gap-1">
        Fix your community, earn
        <span className="flex items-center">
          <img
            src="/images/bitcoin-full-logo.png"
            alt="Bitcoin"
            className="h-4"
            style={{ marginTop: "1px", marginLeft: "-1px" }}
          />
        </span>
      </p>

      <div className="grid grid-cols-2 gap-4 mt-12">
        <div className="flex flex-col items-center p-4 border rounded-lg bg-white/90 dark:bg-gray-900/90">
          <div className="p-3 mb-3 bg-emerald-100 rounded-full dark:bg-emerald-900/50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-600 dark:text-emerald-400"
            >
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">Posters</h3>
          <p className="mt-2 text-sm text-center text-muted-foreground">Report issues and offer rewards</p>
        </div>

        <div className="flex flex-col items-center p-4 border rounded-lg bg-white/90 dark:bg-gray-900/90">
          <div className="p-3 mb-3 bg-blue-100 rounded-full dark:bg-blue-900/50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-600 dark:text-blue-400"
            >
              <path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" />
              <path d="M17.64 15 22 10.64" />
              <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">Fixers</h3>
          <p className="mt-2 text-sm text-center text-muted-foreground">Solve problems and earn sats</p>
        </div>
      </div>
    </div>
  )
}
