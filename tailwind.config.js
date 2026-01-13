/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Semantic Type Colors - JSON Data Types
        type: {
          string: "hsl(var(--type-string))",
          number: "hsl(var(--type-number))",
          boolean: "hsl(var(--type-boolean))",
          array: "hsl(var(--type-array))",
          object: "hsl(var(--type-object))",
          null: "hsl(var(--type-null))",
        },
        // Semantic Status Colors - Comparison States
        status: {
          match: "hsl(var(--status-match))",
          differ: "hsl(var(--status-differ))",
          warning: "hsl(var(--status-warning))",
          "only-a": "hsl(var(--status-only-a))",
          "only-b": "hsl(var(--status-only-b))",
        },
        // Custom palette colors
        charcoal: "#333843",
        "medium-grey": "#9BA0AA",
        "light-grey": "#D7D9DE",
        "soft-white": "#F5F6F8",
        "ice-blue": "#A9D5F5",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "monospace"],
        display: ["var(--font-display)", "cursive"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeInRotate: {
          '0%': { opacity: '0', transform: 'rotate(-5deg)' },
          '100%': { opacity: '1', transform: 'rotate(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
        fadeInUp: 'fadeInUp 0.4s ease-out',
        fadeInScale: 'fadeInScale 0.3s ease-out',
        slideInLeft: 'slideInLeft 0.4s ease-out',
        slideInRight: 'slideInRight 0.3s ease-out',
        scaleIn: 'scaleIn 0.2s ease-out',
        fadeInRotate: 'fadeInRotate 0.4s ease-out',
      },
    },
  },
  plugins: [],
}
