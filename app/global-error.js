"use client"

// Extremely minimal global error page
export default function GlobalError({ error, reset }) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Error - Something went wrong</title>
    <style>
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
        font-size: 2rem;
        font-weight: 700;
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
        border: none;
        cursor: pointer;
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
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Something went wrong!</h1>
      <p>We've encountered an unexpected error. Please try again later.</p>
      <button onclick="window.location.reload()" class="button">Try again</button>
    </div>
  </body>
</html>`
}
