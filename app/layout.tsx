// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Polla Mundialista 2026 | FIFA World Cup',
  description: 'Haz tus predicciones del Mundial 2026, compite con amigos y sube al ranking.',
  openGraph: {
    title: 'Polla Mundialista 2026',
    description: 'Predice, compite y gana.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
