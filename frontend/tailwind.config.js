/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'etsy-orange': '#F1641E',
        'etsy-orange-dark': '#D93A00',
        'etsy-black': '#222222',
        'etsy-gray': '#595959',
        'etsy-light': '#FDEBD2',
      }
    },
  },
  plugins: [],
}
