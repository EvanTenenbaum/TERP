/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'bg-gray-50',
    'bg-white',
    'text-gray-900',
    'text-gray-700',
    'text-gray-500',
    'shadow-card',
    'rounded-lg',
    'border',
    'hover:bg-gray-100',
    'grid',
    'gap-4',
    'p-4',
    'px-6',
    'py-2',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
