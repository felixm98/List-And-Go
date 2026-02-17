/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#4F8A8B',
        'brand-dark': '#3B6F70',
        'brand-black': '#1E293B',
        'brand-gray': '#64748B',
        'brand-light': '#EFF6F6',
        // Keep old names as aliases for compatibility
        'etsy-orange': '#4F8A8B',
        'etsy-orange-dark': '#3B6F70',
        'etsy-black': '#1E293B',
        'etsy-gray': '#64748B',
        'etsy-light': '#EFF6F6',
      }
    },
  },
  plugins: [],
}
