/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
	"./pages/**/*.{js,ts,jsx,tsx,mdx}",
	"./components/**/*.{js,ts,jsx,tsx,mdx}",
	"./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
			// turismo telemetry colors
			'tt-blue': {
				50: '#E6F0FF',
				100: '#CCE0FF',
				200: '#99C2FF',
				300: '#66A3FF',
				400: '#3385FF',
				500: '#0066FF',  // primary blue
				600: '#0052CC',
				700: '#003D99',
				800: '#002966',
				900: '#001433',
			},
			'tt-red': {
				50: '#FFEBEE',
				100: '#FFCDD2',
				200: '#EF9A9A',
				300: '#E57373',
				400: '#EF5350',
				500: '#E60012',  // primary red
				600: '#D32F2F',
				700: '#C62828',
				800: '#B71C1C',
				900: '#7F0000',
			},
			'tt-bg': {
				dark: '#0F1623',       // main background
				card: '#0B0E13',       // card background
				accent: '#2D3748',     // accent background
			},
			'tt-text': {
				primary: '#FFFFFF',    // primary text (white)
				secondary: '#A7C7E7',  // secondary text (light blue)
				muted: '#64748B',      // muted text
			},
			'tt-status': {
				success: '#38A169',    // success (green)
				warning: '#ECC94B',    // warning (yellow)
				error: '#E53E3E',      // error (red)
				info: '#3182CE',       // info (blue)
			},
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-geist-sans)'
  			],
  			mono: [
  				'var(--font-geist-mono)'
  			]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
		keyframes: {
			flash: {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 }
            },
			revFlash: {
                '0%, 100%': { backgroundColor: 'hsl(0, 84%, 60%)' },  // Red
                '50%': { backgroundColor: 'hsl(181, 100%, 56%)' }     // Light blue
            }
		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}