import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Fitness Tracker",
  description: "Personal fitness tracking with Whoop integration",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-border">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <Link href="/" className="font-semibold tracking-tight">
                <span className="text-accent">●</span> fitness
              </Link>
              <nav className="flex gap-1 text-sm">
                <Link href="/" className="btn">Dashboard</Link>
                <Link href="/log" className="btn">Log</Link>
                <Link href="/plan" className="btn">Plan</Link>
                <Link href="/insights" className="btn">Insights</Link>
                <Link href="/goals" className="btn">Goals</Link>
              </nav>
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
