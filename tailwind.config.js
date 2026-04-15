/** @type {import('tailwindcss').Config} */
export default {
  // Tailwind v4 auto-detects content, but explicit for clarity
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  // Dark mode via CSS class — see @custom-variant in src/index.css
  darkMode: ['selector', '&:is(.dark *)'],
}
