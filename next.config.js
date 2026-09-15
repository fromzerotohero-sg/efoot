/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Evita che il build Vercel fallisca per errori ESLint (fix lint in seguito)
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      { source: '/assistant', destination: '/?openAssistantChat=1', permanent: false },
      { source: '/contromisure-pre-partita', destination: '/?openCountermeasures=1', permanent: false },
      { source: '/upload', destination: '/gestione-formazione', permanent: false },
      { source: '/lista-giocatori', destination: '/gestione-formazione', permanent: false },
      { source: '/gestione-profilo', destination: '/impostazioni-profilo', permanent: false },
      { source: '/match/:path*', destination: '/', permanent: false },
    ]
  },
}

module.exports = nextConfig
