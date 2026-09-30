/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0B1020',
          900: '#111827',
          850: '#151D2E',
          800: '#1B2538',
          700: '#243049',
        },
        brand: {
          DEFAULT: '#3B82F6',
          600: '#2563EB',
          violet: '#8B5CF6',
          cyan: '#22D3EE',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        fg: {
          DEFAULT: '#F8FAFC',
          muted: '#94A3B8',
          subtle: '#64748B',
        },
      },
      borderColor: {
        line: 'rgba(148,163,184,0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 24px -12px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
