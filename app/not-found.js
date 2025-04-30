// Simple JavaScript function component with no dependencies
export default function NotFound() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>404 - Page Not Found</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f9fafb;
            color: #111827;
          }
          .container {
            text-align: center;
            padding: 2rem;
            max-width: 28rem;
          }
          h1 {
            font-size: 3.75rem;
            font-weight: 700;
            margin-bottom: 1rem;
          }
          h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 1rem;
          }
          p {
            margin-bottom: 2rem;
            color: #6b7280;
          }
          .button {
            display: inline-block;
            background-color: #10b981;
            color: white;
            font-weight: 500;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            text-decoration: none;
            transition: background-color 0.2s;
          }
          .button:hover {
            background-color: #059669;
          }
          @media (prefers-color-scheme: dark) {
            body {
              background-color: #111827;
              color: #f9fafb;
            }
            p {
              color: #9ca3af;
            }
          }
        `,
          }}
        />
      </head>
      <body>
        <div className="container">
          <h1>404</h1>
          <h2>Page Not Found</h2>
          <p>The page you are looking for doesn't exist or has been moved.</p>
          <a href="/" className="button">
            Return to Home
          </a>
        </div>
      </body>
    </html>
  )
}
