"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body className="p-6">
        <div className="max-w-xl mx-auto border rounded p-4 bg-red-50">
          <h2 className="text-lg font-semibold text-red-700">Something went wrong</h2>
          <p className="text-sm text-red-600 break-words mt-2">{error?.message}</p>
          <button onClick={reset} className="mt-4 px-3 py-2 bg-blue-600 text-white rounded">Try again</button>
        </div>
      </body>
    </html>
  )
}
