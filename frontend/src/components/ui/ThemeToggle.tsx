"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeProvider";

const ThemeToggle = () => {
    const {mode, toggleMode} = useTheme();
    
    return (
        <button
            onClick={toggleMode}
            className="fixed bottom-4 right-4 p-2 rounded-full bg-tt-bg-card border border-tt-bg-accent shadow-lg transition-colors duration-200 hover:bg-tt-bg-accent z-50"
            aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
        >
            {mode === 'dark' ? (
                <Sun className="h-5 w-5 text-tt-text-primary" />
            ) : (
                <Moon className="h-5 w-5 text-tt-text-primary" />
            )}
        </button>
    );
};

export default ThemeToggle;
