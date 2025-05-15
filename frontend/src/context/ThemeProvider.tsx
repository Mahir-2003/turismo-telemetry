'use client';

import { create } from 'domain';
import { createConnection } from 'net';
import React, {createContext, useContext, useState, useEffect } from 'react';

type ThemeMode = 'dark' | 'light';
type ThemeAccent = 'blue' | 'red' | 'orange' | 'green'

interface ThemeContextType {
    mode: ThemeMode;
    accent: ThemeAccent;
    setMode: (mode: ThemeMode) => void;
    setAccent: (accent: ThemeAccent) => void;
    toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: {children: React.ReactNode }) => {
    const [mode, setMode] = useState<ThemeMode>('dark');
    const [accent, setAccent] = useState<ThemeAccent>('blue');

    // load saved theme preferences if they exist when component mounts
    useEffect(() => {
        const savedMode = localStorage.getItem('ttThemeMode') as ThemeMode;
        const savedAccent = localStorage.getItem('ttThemeAccent') as ThemeAccent;

        if (savedMode) setMode(savedMode);
        if (savedAccent) setAccent(savedAccent);
    }, []);

    // apply theme changes to document and save preferences
    useEffect(() => {
        const root = document.documentElement;

        if (mode == 'dark') {
            root.classList.add('dark');
            document.body.style.backgroundColor = 'var(--tt-bg-dark)';
            document.body.style.color = 'var(--tt-text-primary)';
        } else {
            root.classList.remove('dark');
            document.body.style.backgroundColor = '#FFFFFF';
            document.body.style.color = '#1A202C';
        }

        // Apply accent color as a data attribute on root
    root.setAttribute('data-accent', accent);
    
    // Save preferences
    localStorage.setItem('ttThemeMode', mode);
    localStorage.setItem('ttThemeAccent', accent);

    }, [mode, accent]);

    const toggleMode = () => {
        setMode(prevMode => (prevMode === 'dark' ? 'light' : 'dark'));
    };

    const value = {
        mode,
        accent,
        setMode,
        setAccent,
        toggleMode,
      };


    return (
    <ThemeContext.Provider value={value}>
        {children}
    </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// component for themeing UI components
export const withTheme = <P extends object>(
    Component: React.ComponentType<P>
) => {
    return (props: P) => {
        const theme = useTheme();
        return <Component {...props} theme={theme} />;
    };
};