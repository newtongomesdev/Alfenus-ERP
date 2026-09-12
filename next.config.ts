import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/servicos/simulador",
        destination: "/simulador",
        permanent: false,
      },
      {
        source: "/servicos/simulador/novo",
        destination: "/simulador/novo",
        permanent: false,
      },
      {
        source: "/servicos/simulador/:path*",
        destination: "/simulador/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;