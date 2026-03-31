import './globals.css'
import LanguageProviderWrapper from '@/components/LanguageProviderWrapper'
import { SidebarProvider } from '@/components/SidebarContext'
import AppLayoutShell from '@/components/AppLayoutShell'
import { GameAnalysisModalNavProvider } from '@/components/GameAnalysisModalNavContext'

// Layout unico: usare solo questo file. Non creare layout.tsx (conflitti / layout sbagliato = dashboard non carica).
// Title/description: default IT; client can set document.title by lang via LanguageProviderWrapper
export const metadata = {
  title: 'From Zero to Hero - eFootball AI Coach',
  description: 'Coach AI per eFootball: rosa, partite, analisi e consigli tattici personalizzati.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className="text-[#FFFFFF]">
        <LanguageProviderWrapper>
          <GameAnalysisModalNavProvider>
            <SidebarProvider>
              <AppLayoutShell>{children}</AppLayoutShell>
            </SidebarProvider>
          </GameAnalysisModalNavProvider>
        </LanguageProviderWrapper>
      </body>
    </html>
  )
}
