/**
 * Supported countries and currencies for Prism
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
 * Format currency amount based on country
 */
export function formatCurrency(amount: number, countryCode: string): string {
  const country = getCountry(countryCode)
  if (!country) return `$${amount.toFixed(2)}`
  
  return `${country.symbol}${amount.toFixed(2)}`
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
