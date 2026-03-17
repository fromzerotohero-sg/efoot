import './globals.css'
import LanguageProviderWrapper from '@/components/LanguageProviderWrapper'
import SidebarNew from '@/components/SidebarNew'
import TopBar from '@/components/TopBar'
import BottomNavigation from '@/components/BottomNavigation'

// Layout unico: usare solo questo file. Non creare layout.tsx (conflitti / layout sbagliato = dashboard non carica).
// Title/description: default IT; client can set document.title by lang via LanguageProviderWrapper
export const metadata = {
  title: 'From Zero to Hero - eFootball AI Coach',
  description: 'Coach AI per eFootball: rosa, partite, analisi e consigli tattici personalizzati.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className="text-[#FFFFFF]">
        <LanguageProviderWrapper>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <SidebarNew />
            
            {/* Main content area */}
            <div 
              className="flex-1 flex flex-col lg:ml-64 overflow-hidden"
              style={{
                paddingBottom: 'var(--bottom-nav-height, 0px)'
              }}
            >
              {/* Top bar */}
              <TopBar />
              
              {/* Page content */}
              <main 
                className="flex-1 overflow-y-auto"
                style={{
                  paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))'
                }}
              >
                {children}
                {/* Spacer aggiuntivo per mobile - assicura che i bottoni in fondo siano cliccabili */}
                <div className="lg:hidden" style={{ height: '20px' }} />
              </main>
            </div>
          </div>
          
          {/* Bottom Navigation - solo mobile */}
          <BottomNavigation />
        </LanguageProviderWrapper>
      </body>
    </html>
  )
}
