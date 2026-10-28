/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // User primary brand palette — Royal Blue #1d5f99
        brand: {
          50: '#F0F7FF',
          100: '#E0EEFB',
          200: '#B9DAF6',
          300: '#7EBAEE',
          400: '#3D95E3',
          500: '#1d5f99', // Primary Blue
          600: '#174e7e',
          700: '#123d64',
          800: '#0e2d4a',
          900: '#091e32',
          950: '#061320',
        },
        // Royal Plum Purple #683669
        edumoPurple: {
          50: '#FAF5FB',
          100: '#F3E8F5',
          200: '#E5CEE9',
          300: '#D0A7D7',
          400: '#A45CAE',
          500: '#683669', // Core Purple
          600: '#562B57',
          700: '#432044',
          800: '#321733',
          900: '#220e23',
        },
        // Crimson Wine Red #a5243d
        edumoRed: {
          50: '#FEF2F4',
          100: '#FDE6EA',
          200: '#FCCFD8',
          300: '#F9A8B8',
          400: '#DF4A69',
          500: '#a5243d', // Core Crimson Red
          600: '#891B30',
          700: '#6E1425',
          800: '#530D1B',
          900: '#3B0812',
        },
        accent: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981', // Accent green
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        surface: {
          50: '#F9FAFB',
          100: '#F3F4F6', // --color-gray
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563', // --color-text
          700: '#374151',
          800: '#1F2937', // --color-dark
          900: '#111827',
          950: '#0B0F19',
        },
        warning: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        danger: {
          400: '#F87171',
          500: '#a5243d',
          600: '#891B30',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.08)',
        'glow': '0 0 25px rgba(29, 95, 153, 0.45)',
        'glow-purple': '0 0 25px rgba(104, 54, 105, 0.45)',
        'glow-red': '0 0 25px rgba(165, 36, 61, 0.45)',
        'glow-sm': '0 0 10px rgba(29, 95, 153, 0.25)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
