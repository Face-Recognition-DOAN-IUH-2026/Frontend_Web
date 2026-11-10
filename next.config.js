/** @type {import('next').NextConfig} */
const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:80').replace(/\/api\/?$/, '').replace(/\/$/, '');

const nextConfig = {
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