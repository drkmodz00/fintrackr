import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'fintrakr — Expense Tracker',
  description: 'Track your expenses with Spendr',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}