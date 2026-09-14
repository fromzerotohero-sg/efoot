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
  // UX V2 staging safety: analytics e install prompt disattivati su staging/preview.
  // Fail-safe: senza NEXT_PUBLIC_APP_ENV il comportamento production resta invariato.
  const isStaging = process.env.NEXT_PUBLIC_APP_ENV === 'staging'
  const isVercelPreview = process.env.VERCEL_ENV === 'preview'
  const disableAnalytics = isStaging || isVercelPreview
  const showInstallPrompt = !isStaging && !isVercelPreview

  return (
    <html lang="it">
      <head>
        {/* Tema UX V2: applicato pre-paint per evitare flash (persistenza: localStorage 'fzth_theme') */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('fzth_theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}"
          }}
        />
        {!disableAnalytics && (
          <>
            <Script id="microsoft-clarity" strategy="afterInteractive">
              {`
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "wylmfczjap");
              `}
            </Script>
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
          </>
        )}
      </head>
      <body className="text-[#FFFFFF]">
        <LanguageProviderWrapper>
          <GameAnalysisModalNavProvider>
            <SidebarProvider>
              <AppLayoutShell
                showInstallPrompt={showInstallPrompt}
                showStagingBadge={isStaging}
              >
                {children}
              </AppLayoutShell>
            </SidebarProvider>
          </GameAnalysisModalNavProvider>
        </LanguageProviderWrapper>
      </body>
    </html>
  )
}
