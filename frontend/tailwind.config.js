/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background:    'hsl(var(--background))',
        foreground:    'hsl(var(--foreground))',
        card:          'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        popover:       'hsl(var(--popover))',
        'popover-foreground': 'hsl(var(--popover-foreground))',
        primary:       'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        secondary:     'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        muted:         'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent:        'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        destructive:   'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        border:        'hsl(var(--border))',
        input:         'hsl(var(--input))',
        ring:          'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans:    ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      },
      animation: {
        marquee: 'marquee 16s linear infinite',
        'fade-in': 'fadeIn 150ms ease',
        'slide-up': 'slideUp 320ms cubic-bezier(0.33,1,0.68,1)',
      },
    },
  },
  plugins: [],
};
