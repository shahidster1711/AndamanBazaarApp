import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Andaman Planner Pro",
  description: "AI-powered Andaman & Nicobar Islands trip itinerary planner",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-warm-50 text-gray-900 antialiased">
        <header className="bg-teal-700 text-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">🏝️</span>
            <div>
              <h1 className="font-bold text-lg leading-none">Andaman Planner Pro</h1>
              <p className="text-teal-200 text-xs">AI-powered itinerary generator</p>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="text-center text-xs text-gray-400 py-6 mt-8 border-t border-gray-100">
          Powered by{" "}
          <a href="https://andamanbazaar.in" className="text-teal-600 hover:underline">
            AndamanBazaar.in
          </a>{" "}
          · AI model: Google Gemini
        </footer>
      </body>
    </html>
  )
}
