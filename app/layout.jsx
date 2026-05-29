import './globals.css'
import Script from 'next/script'
import LanguageProviderWrapper from '@/components/LanguageProviderWrapper'
import { SidebarProvider } from '@/components/SidebarContext'
import AppLayoutShell from '@/components/AppLayoutShell'
import { GameAnalysisModalNavProvider } from '@/components/GameAnalysisModalNavContext'

// Layout unico: usare solo questo file. Non creare layout.tsx (conflitti / layout sbagliato = dashboard non carica).
// Title/description: default IT; client can set document.title by lang via LanguageProviderWrapper
export const metadata = {
  title: 'From Zero to Hero - eFootball AI Coach',
  description: 'Coach AI per eFootball: rosa, partite, analisi e consigli tattici personalizzati.',
  applicationName: 'Zero to Hero',
  appleWebApp: {
    capable: true,
    title: 'Zero to Hero',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: '#03050c',
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
    shortcut: '/logo.png',
    apple: [{ url: '/logo.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <Script
          src="https://t.contentsquare.net/uxa/fe0d501fcb882.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-X69T3QE3GG"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-X69T3QE3GG');
          `}
        </Script>
      </head>
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
