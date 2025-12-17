import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Magic UI Dark Theme Colors
        background: '#020617', // slate-950
        foreground: '#F9FAFB', // gray-50
        
        card: {
          DEFAULT: '#0F172A', // slate-900
          foreground: '#F9FAFB',
        },
        
        // Primary - Cyan (Magic UI accent)
        primary: {
          DEFAULT: '#22D3EE', // cyan-400
          foreground: '#020617',
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        
        // Accent - Violet/Indigo (Magic UI secondary)
        accent: {
          DEFAULT: '#6366F1', // indigo-500
          foreground: '#F9FAFB',
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        
        // Muted colors for secondary text and backgrounds
        muted: {
          DEFAULT: '#475569', // slate-600
          foreground: '#94A3B8', // slate-400
        },
        
        // Status colors
        success: {
          DEFAULT: '#10B981', // emerald-500
          foreground: '#F9FAFB',
        },
        warning: {
          DEFAULT: '#F59E0B', // amber-500
          foreground: '#020617',
        },
        error: {
          DEFAULT: '#EF4444', // red-500
          foreground: '#F9FAFB',
        },
        
        // Border colors
        border: '#1E293B', // slate-800
        input: '#334155', // slate-700
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        // Existing shadows
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        
        // Magic UI glow effects
        'glow-sm': '0 0 20px rgba(34, 211, 238, 0.3)',
        'glow-md': '0 0 40px rgba(34, 211, 238, 0.4)',
        'glow-lg': '0 0 60px rgba(34, 211, 238, 0.5)',
        'glow-accent': '0 0 40px rgba(99, 102, 241, 0.4)',
        'glow-accent-lg': '0 0 60px rgba(99, 102, 241, 0.5)',
        
        // Card shadows for dark theme
        'card': '0 0 40px rgba(15, 23, 42, 0.75)',
        'card-hover': '0 0 60px rgba(34, 211, 238, 0.2)',
      },
      animation: {
        // Existing animations
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-out-right': 'slideOutRight 0.3s ease-in',
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-in',
        'scale-in': 'scaleIn 0.2s ease-out',
        
        // Magic UI animations
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient-shift': 'gradientShift 3s ease infinite',
      },
      keyframes: {
        // Existing keyframes
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        
        // Magic UI keyframes
        glowPulse: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(34, 211, 238, 0.3)',
            opacity: '1',
          },
          '50%': {
            boxShadow: '0 0 40px rgba(34, 211, 238, 0.6)',
            opacity: '0.8',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundSize: {
        'gradient-shift': '200% 200%',
      },
    },
  },
  plugins: [],
};

export default config;
