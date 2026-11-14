/** @type {import('next').NextConfig} */
const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://iuhlib-api.duckdns.org').replace(/\/api\/?$/, '').replace(/\/$/, '');

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.iuh.edu.vn" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "**.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "iuhlib-api.duckdns.org" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: [
      '@mui/icons-material',
      '@mui/material',
      'lucide-react',
      'recharts',
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/camera/proxy',
          destination: '/api/camera/proxy',
        },
        {
          source: '/api/camera/snapshot/:path*',
          destination: '/api/camera/snapshot/:path*',
        },
      ],
      fallback: [
        {
          source: '/api/:path*',
          destination: `${BACKEND_URL}/api/:path*`,
        },
        {
          source: '/users/:path*',
          destination: `${BACKEND_URL}/users/:path*`,
        },
      ],
    };
  },
};

module.exports = nextConfig;