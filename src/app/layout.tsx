import type { Metadata } from 'next'
import './globals.css'
import Topbar from '@/components/Topbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'ToolBox',
  description: 'Plateforme d\'outils internes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Topbar />
        <main style={{ minHeight: 'calc(100vh - 120px)' }}>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
