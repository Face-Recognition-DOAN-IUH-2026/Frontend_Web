/** @type {import('next').NextConfig} */
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
          destination: 'http://127.0.0.1:80/api/:path*',
        },
        {
          source: '/users/:path*',
          destination: 'http://127.0.0.1:80/users/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;