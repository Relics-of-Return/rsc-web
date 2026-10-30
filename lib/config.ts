const envUrl = process.env.NEXT_PUBLIC_SITE_URL
const fallbackUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://www.relicsofreturn.com'
    : 'http://127.0.0.1:3000'

const resolved = (envUrl || fallbackUrl).replace(/\/+$/, '')

// Ensure canonical domain uses www to prevent redirect chains
export const SITE_URL = resolved.replace(
  /^https?:\/\/relicsofreturn\.com$/,
  'https://www.relicsofreturn.com',
)
