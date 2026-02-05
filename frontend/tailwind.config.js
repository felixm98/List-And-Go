/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#E8A0A0',
        'brand-dark': '#D18080',
        'brand-black': '#2D2D2D',
        'brand-gray': '#595959',
        'brand-light': '#FDF0F0',
        // Keep old names as aliases for compatibility
        'etsy-orange': '#E8A0A0',
        'etsy-orange-dark': '#D18080',
        'etsy-black': '#2D2D2D',
        'etsy-gray': '#595959',
        'etsy-light': '#FDF0F0',
      }
    },
  },
  plugins: [],
}
