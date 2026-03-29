import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // New blue/green theme
        'verkspay-primary': '#0055B8', // Deep shield blue
        'verkspay-accent': '#00A8E8', // Gradient teal
        'verkspay-success': '#4CAF50', // Checkmark green
        'verkspay-dark': '#1A1A2E', // Dark text
        'verkspay-light': '#F8FAFC', // Light background
      },
      keyframes: {
        'loading-bar': {
          '0%': { width: '0%', marginLeft: '0%' },
          '50%': { width: '60%', marginLeft: '20%' },
          '100%': { width: '0%', marginLeft: '100%' },
        },
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
      },
      animation: {
        'loading-bar': 'loading-bar 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 0.2s ease-in',
      },
    },
  },
  plugins: [],
}
export default config
