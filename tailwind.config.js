/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#F97316", // Cafe QR Orange
          foreground: "#FFFFFF",
        },
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        qrsurface: '#f8fafc',
        qrcard: '#ffffff',
        qrink: '#0f172a',
        qrmuted: '#64748b',
        qrline: '#e2e8f0',
        qrlineSoft: '#f1f5f9',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
