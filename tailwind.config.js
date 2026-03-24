/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./frontend/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        gray: {
          950: '#0a0a0a',
          900: '#171717',
          800: '#262626',
          700: '#404040',
          400: '#a3a3a3',
        }
      }
    }
  },
  plugins: [],
}
