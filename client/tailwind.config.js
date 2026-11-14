/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#060b16', 900: '#0a1120', 800: '#0e1729' },
        panel: '#111b2e',
        charcoal: '#182235',
        line: '#233048',
        neon: { DEFAULT: '#2cff8a', dim: '#1fc468' },
        electric: '#3d8bff',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        toastIn: { '0%': { opacity: 0, transform: 'translateX(24px)' }, '100%': { opacity: 1, transform: 'none' } },
        pulseRing: { '0%,100%': { opacity: 0.9 }, '50%': { opacity: 0.35 } },
      },
      animation: { rise: 'rise .35s ease-out both', toast: 'toastIn .25s ease-out both', ring: 'pulseRing 1.4s ease-in-out infinite' },
    },
  },
  plugins: [],
};
