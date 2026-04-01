/**
 * Supported countries and currencies for Verkspay
 * Only non-sanctioned countries with major currencies
 */

export interface Country {
  code: string
  name: string
  currency: string
  symbol: string
  dateFormat: string
  timezone: string
}

export const SUPPORTED_COUNTRIES: Country[] = [
  // Southeast Asia
  { code: 'MY', name: 'Malaysia', currency: 'MYR', symbol: 'RM', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Kuala_Lumpur' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', symbol: 'S$', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Singapore' },
  { code: 'TH', name: 'Thailand', currency: 'THB', symbol: '฿', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Bangkok' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', symbol: 'Rp', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Jakarta' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', symbol: '₱', dateFormat: 'MM/DD/YYYY', timezone: 'Asia/Manila' },
  { code: 'VN', name: 'Vietnam', currency: 'VND', symbol: '₫', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Ho_Chi_Minh' },

  // East Asia
  { code: 'JP', name: 'Japan', currency: 'JPY', symbol: '¥', dateFormat: 'YYYY/MM/DD', timezone: 'Asia/Tokyo' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', symbol: '₩', dateFormat: 'YYYY/MM/DD', timezone: 'Asia/Seoul' },
  { code: 'TW', name: 'Taiwan', currency: 'TWD', symbol: 'NT$', dateFormat: 'YYYY/MM/DD', timezone: 'Asia/Taipei' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD', symbol: 'HK$', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Hong_Kong' },

  // South Asia
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Kolkata' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', symbol: 'Rs', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Colombo' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', symbol: '৳', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Dhaka' },

  // Oceania
  { code: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$', dateFormat: 'DD/MM/YYYY', timezone: 'Australia/Sydney' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', symbol: 'NZ$', dateFormat: 'DD/MM/YYYY', timezone: 'Pacific/Auckland' },

  // Middle East (non-sanctioned)
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', symbol: 'د.إ', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Dubai' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', symbol: '﷼', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Riyadh' },
  { code: 'QA', name: 'Qatar', currency: 'QAR', symbol: 'ر.ق', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Qatar' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', symbol: 'د.ك', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Kuwait' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD', symbol: 'BD', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Bahrain' },
  { code: 'OM', name: 'Oman', currency: 'OMR', symbol: 'ر.ع.', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Muscat' },
  { code: 'JO', name: 'Jordan', currency: 'JOD', symbol: 'JD', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Amman' },

  // Africa (major economies, non-sanctioned)
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', symbol: 'R', dateFormat: 'DD/MM/YYYY', timezone: 'Africa/Johannesburg' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', symbol: '₦', dateFormat: 'DD/MM/YYYY', timezone: 'Africa/Lagos' },
  { code: 'KE', name: 'Kenya', currency: 'KES', symbol: 'KSh', dateFormat: 'DD/MM/YYYY', timezone: 'Africa/Nairobi' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', symbol: '₵', dateFormat: 'DD/MM/YYYY', timezone: 'Africa/Accra' },
  { code: 'EG', name: 'Egypt', currency: 'EGP', symbol: 'E£', dateFormat: 'DD/MM/YYYY', timezone: 'Africa/Cairo' },
  { code: 'MA', name: 'Morocco', currency: 'MAD', symbol: 'د.م.', dateFormat: 'DD/MM/YYYY', timezone: 'Africa/Casablanca' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', symbol: 'TSh', dateFormat: 'DD/MM/YYYY', timezone: 'Africa/Dar_es_Salaam' },

  // Europe
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/London' },
  { code: 'DE', name: 'Germany', currency: 'EUR', symbol: '€', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Berlin' },
  { code: 'FR', name: 'France', currency: 'EUR', symbol: '€', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Paris' },
  { code: 'IT', name: 'Italy', currency: 'EUR', symbol: '€', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Rome' },
  { code: 'ES', name: 'Spain', currency: 'EUR', symbol: '€', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Madrid' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', symbol: '€', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Amsterdam' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', symbol: 'kr', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Stockholm' },
  { code: 'NO', name: 'Norway', currency: 'NOK', symbol: 'kr', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Oslo' },
  { code: 'DK', name: 'Denmark', currency: 'DKK', symbol: 'kr', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Copenhagen' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', symbol: 'Fr', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Zurich' },
  { code: 'PL', name: 'Poland', currency: 'PLN', symbol: 'zł', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Warsaw' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', symbol: '€', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Lisbon' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', symbol: '€', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Dublin' },
  { code: 'FI', name: 'Finland', currency: 'EUR', symbol: '€', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Helsinki' },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK', symbol: 'Kč', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Prague' },
  { code: 'RO', name: 'Romania', currency: 'RON', symbol: 'lei', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Bucharest' },
  { code: 'HU', name: 'Hungary', currency: 'HUF', symbol: 'Ft', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Budapest' },
  { code: 'GR', name: 'Greece', currency: 'EUR', symbol: '€', dateFormat: 'DD/MM/YYYY', timezone: 'Europe/Athens' },

  // Americas
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$', dateFormat: 'MM/DD/YYYY', timezone: 'America/New_York' },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'C$', dateFormat: 'DD/MM/YYYY', timezone: 'America/Toronto' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', symbol: '$', dateFormat: 'DD/MM/YYYY', timezone: 'America/Mexico_City' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', symbol: 'R$', dateFormat: 'DD/MM/YYYY', timezone: 'America/Sao_Paulo' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', symbol: '$', dateFormat: 'DD/MM/YYYY', timezone: 'America/Argentina/Buenos_Aires' },
  { code: 'CL', name: 'Chile', currency: 'CLP', symbol: '$', dateFormat: 'DD/MM/YYYY', timezone: 'America/Santiago' },
  { code: 'CO', name: 'Colombia', currency: 'COP', symbol: '$', dateFormat: 'DD/MM/YYYY', timezone: 'America/Bogota' },
  { code: 'PE', name: 'Peru', currency: 'PEN', symbol: 'S/', dateFormat: 'DD/MM/YYYY', timezone: 'America/Lima' },
]

/**
 * Sanctioned countries — blocked from signup
 * Based on OFAC, EU, and UN sanctions lists
 */
export const SANCTIONED_COUNTRIES = [
  'RU', // Russia
  'BY', // Belarus
  'KP', // North Korea
  'IR', // Iran
  'SY', // Syria
  'CU', // Cuba
  'VE', // Venezuela
  'MM', // Myanmar
  'SD', // Sudan
  'SS', // South Sudan
  'LY', // Libya (partial)
  'SO', // Somalia
  'YE', // Yemen
  'ZW', // Zimbabwe
  'CD', // DR Congo
  'CF', // Central African Republic
  'ML', // Mali
  'NI', // Nicaragua
  'HT', // Haiti
]

/**
 * Get country by code
 */
export function getCountry(code: string): Country | undefined {
  return SUPPORTED_COUNTRIES.find(c => c.code === code)
}

/**
 * Get currency symbol for a country
 */
export function getCurrencySymbol(countryCode: string): string {
  const country = getCountry(countryCode)
  return country?.symbol || '$'
}

/**
 * Format currency amount based on currency code (Intl.NumberFormat)
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date based on country code
 */
export function formatDate(date: string, countryCode: string): string {
  const locale = countryCode === 'US' ? 'en-US' : 'en-GB'
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date))
}

/**
 * Get all country codes
 */
export function getCountryCodes(): string[] {
  return SUPPORTED_COUNTRIES.map(c => c.code)
}

/**
 * Get all country names
 */
export function getCountryNames(): string[] {
  return SUPPORTED_COUNTRIES.map(c => c.name)
}

/**
 * Check if country is allowed (not sanctioned)
 */
export function isCountryAllowed(countryCode: string): boolean {
  return !SANCTIONED_COUNTRIES.includes(countryCode) &&
    SUPPORTED_COUNTRIES.some(c => c.code === countryCode)
}

/**
 * Get country configuration by code
 */
export function getCountryConfig(countryCode: string): Country | undefined {
  return SUPPORTED_COUNTRIES.find(c => c.code === countryCode)
}

/**
 * Stripe Connect Express is supported in these countries
 * https://stripe.com/global
 */
const STRIPE_SUPPORTED_COUNTRIES = [
  'US', 'CA', 'GB', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'DK', 'SE', 'NO', 'FI',
  'PL', 'CZ', 'RO', 'PT', 'GR', 'HU', 'SK', 'SI',
  'JP', 'KR', 'SG', 'HK', 'AU', 'NZ', 'TW',
  'MX', 'BR', 'AR', 'CL',
  'ZA', 'AE', 'IN',
]

/**
 * Check if Stripe is supported in a country
 */
export function isStripeSupported(countryCode: string): boolean {
  return STRIPE_SUPPORTED_COUNTRIES.includes(countryCode)
}
