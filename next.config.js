/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:80/api/:path*',
      },
      {
        source: '/users/:path*',
        destination: 'http://127.0.0.1:80/users/:path*',
      },
    ];
  },
};

module.exports = nextConfig;