/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:80/api/:path*',
      },
      {
        source: '/users/:path*',
        destination: 'http://localhost:80/users/:path*',
      },
    ];
  },
};

module.exports = nextConfig;