export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://www.relicsofreturn.com'
    : 'http://127.0.0.1:3000')
).replace(/\/+$/, '')
