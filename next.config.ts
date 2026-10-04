import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the manager and the launcher open the site as 127.0.0.1:3000, which Next
  // 16's dev server blocks the dev-only files (chunks, css, hot reload) for
  // unless it's named. dev only: `next build` and `next start` ignore it
  allowedDevOrigins: ['127.0.0.1', 'localhost'],

  // rsc-landscape pulls in node-canvas, which is a native module. it is only
  // ever touched from route handlers, so it has to stay a real require at
  // runtime rather than being bundled
  serverExternalPackages: [
    'canvas',
    '@2003scape/rsc-landscape',
    '@2003scape/rsc-archiver',
  ],

  // the wiki is its own Next app (rsc-wiki, basePath /wiki) on port 3010;
  // proxying it under the same origin lets the client's ::wiki lookup open
  // <site>/wiki/search?q=... and keeps every link on the site relative
  async rewrites() {
    const wiki = process.env.RSC_WIKI_URL ?? 'http://127.0.0.1:3010'

    return [
      { source: '/wiki', destination: `${wiki}/wiki` },
      { source: '/wiki/:path*', destination: `${wiki}/wiki/:path*` },
    ]
  },

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
      // public, read-only data the game client's side panels read from its
      // own origin (rsc-client's hiscores, market and news panels) - the
      // same as /api/worlds and /api/settings already allow
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
