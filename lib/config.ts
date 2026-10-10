export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000').replace(
  /\/+$/,
  '',
)