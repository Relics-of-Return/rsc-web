import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // rsc-landscape pulls in node-canvas, which is a native module. it is only
  // ever touched from route handlers, so it has to stay a real require at
  // runtime rather than being bundled
  serverExternalPackages: [
    'canvas',
    '@2003scape/rsc-landscape',
    '@2003scape/rsc-archiver',
  ],

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
