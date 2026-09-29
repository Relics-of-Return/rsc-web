// rsc-data-server stores a world's country as an ISO 3166 alpha-3 code
const COUNTRIES: Record<string, string> = {
  AUS: 'Australia',
  BRA: 'Brazil',
  CAN: 'Canada',
  DEU: 'Germany',
  DNK: 'Denmark',
  FIN: 'Finland',
  FRA: 'France',
  GBR: 'United Kingdom',
  IRL: 'Ireland',
  JPN: 'Japan',
  NLD: 'Netherlands',
  NOR: 'Norway',
  NZL: 'New Zealand',
  SGP: 'Singapore',
  SWE: 'Sweden',
  USA: 'United States',
  ZAF: 'South Africa',
}

export function countryName(code: unknown): string {
  if (typeof code !== 'string' || !code) {
    return 'Unknown'
  }

  return COUNTRIES[code.toUpperCase()] ?? code
}
