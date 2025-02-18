import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to import these modules on the client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        'aws-sdk': false,
        'mock-aws-s3': false,
        nock: false,
        'child_process': false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
        util: false,
      };
    }

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['bcrypt', 'pg']
  }
};

export default nextConfig;
