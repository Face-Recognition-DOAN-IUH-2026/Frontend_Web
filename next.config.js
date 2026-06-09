/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost/api/:path*",
      },
      {
        source: "/auth/:path*",
        destination: "http://localhost/auth/:path*",
      },
      {
        source: "/users/:path*",
        destination: "http://localhost/users/:path*",
      },
      {
        source: "/docs/:path*",
        destination: "http://localhost/docs/:path*",
      },
      {
        source: "/tasks/:path*",
        destination: "http://localhost/tasks/:path*",
      },
      {
        source: "/openapi.json",
        destination: "http://localhost/openapi.json",
      },
      {
        source: "/healthz",
        destination: "http://localhost/healthz",
      },
    ];
  },
};

module.exports = nextConfig;