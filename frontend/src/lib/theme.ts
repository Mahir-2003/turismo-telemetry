// define theme constants and utility functions in this file

export const COLORS = {
    // primary brand colors
    brand: {
        blue: {
            light: 'tt-blue-400',
            main: 'tt-blue-500',
            dark: 'tt-blue-600',
        },
        red: {
            light: 'tt-red-400',
            main: 'tt-red-500',
            dark: 'tt-red-600', 
        },
    },
    // ui background colors
    background: {
        main: 'tt-bg-dark',
        card: 'tt-bg-card',
        accent: 'tt-bg-accent',
    },
    // text colors
    text: {
        primary: 'tt-text-primary',
        secondary: 'tt-text-secondary',
        muted: 'tt-text-muted',
    },
    // status colors
    status: {
        success: 'tt-status-success',
        warning: 'tt-status-warning',
        error: 'tt-status-error',
        info: 'tt-status-info',
    }
};

export const GRADIENTS = {
    blueToDark: 'bg-gradient-to-r from-tt-blue-600 to-tt-bg-dark',
    redToBlue: 'bg-gradient-to-r from-tt-red-500 to-tt-blue-500',
    darkBlue: 'bg-gradient-to-b from-tt-bg-card to-tt-bg-dark',
}

/**
 * Theme config for charts and data visualizations 
 * to maintain color consistency
 */
export const VISUALIZATION_COLORS = {
    // for charts
    primary: ['#0066FF', '#E60012', '#38A169', '#ECC94B'],
    // for tire temps or other heat indicators
    heatmap: {
        cold: '#3182CE', // Blue
        optimal: '#38A169', // Green
        hot: '#E53E3E', // Red
    },
}

/**
 * Helper function to get a CSS var for a theme color
 * Usage: getColorVar('tt-blue-500')
 */
export const getColorVar = (colorName: string): string => {
    return `var(--${colorName})`;
}

// theme object for styled components or other styling libraries (if used)
export const theme = {
    colors: COLORS,
    gradients: GRADIENTS,
    visualization_colors: VISUALIZATION_COLORS,
    spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
    },
    borderRadius: {
        sm: '0.25rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
    },
};

export default theme;