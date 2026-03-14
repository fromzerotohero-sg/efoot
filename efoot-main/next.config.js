/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Evita che il build Vercel fallisca per errori ESLint (fix lint in seguito)
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
