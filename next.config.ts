import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],

  serverExternalPackages: [
    'canvas',
    '@2003scape/rsc-landscape',
    '@2003scape/rsc-archiver',
  ],

  async rewrites() {
    const wiki = process.env.RSC_WIKI_URL ?? 'http://127.0.0.1:3010'

    return [
      { source: '/wiki', destination: `${wiki}/wiki` },
      { source: '/wiki/:path*', destination: `${wiki}/wiki/:path*` },
    ]
  },

  async redirects() {
    return [
      {
        source: '/beta',
        destination: 'https://github.com/orgs/Relics-of-Return/projects/1',
        permanent: false,
      },
    ]
  },

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
      // Allow public, read-only access to the hiscores, tradepost, and news for the game client's side panels
      ...['/api/hiscores', '/api/hiscores/:path*', '/api/tradepost', '/api/tradepost/:path*', '/api/news'].map(
        (source) => ({
          source,
          headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
        }),
      ),
    ];
  },
};

export default nextConfig;
