/** PWA: icona e nome quando l’utente aggiunge il sito alla home (iOS/Android). */
export default function manifest() {
  return {
    name: 'From Zero to Hero',
    short_name: 'Zero to Hero',
    description: 'Coach AI per eFootball: rosa, partite, analisi e consigli tattici personalizzati.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#03050c',
    icons: [
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
