/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    'bg-blue-600',
    'text-white',
    'hover:bg-blue-700',
    // Add any other classes that might be getting purged
  ]
} 