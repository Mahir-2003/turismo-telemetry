import React, { useEffect, useState } from 'react';
import { Beaker } from 'lucide-react';

interface DevModeToggleProps {
  isDevMode: boolean;
  onToggle: (enabled: boolean) => void;
}

const DevModeToggle: React.FC<DevModeToggleProps> = ({ isDevMode, onToggle }) => {
  // Handle toggle click
  const handleToggle = () => {
    const newValue = !isDevMode;
    onToggle(newValue);
    
    // Store preference in localStorage
    localStorage.setItem('turismoTelemetryDevMode', newValue ? 'true' : 'false');
  };

  return (
    <div 
      className={`fixed top-4 right-4 z-50 bg-tt-bg-card border-2 ${
        isDevMode ? 'border-green-500 text-green-500' : 'border-tt-bg-accent text-tt-text-secondary'
      } rounded-lg p-2 flex items-center gap-2 cursor-pointer transition-colors duration-200`}
      onClick={handleToggle}
      title={isDevMode ? 'Disable Development Mode' : 'Enable Development Mode'}
    >
      <Beaker className="h-5 w-5" />
      <span className="text-sm font-medium">
        {isDevMode ? 'Dev Mode' : 'Dev Mode'}
      </span>
      <div className={`h-3 w-7 rounded-full p-0.5 transition-colors duration-200 ${
        isDevMode ? 'bg-green-500' : 'bg-tt-bg-dark'
      }`}>
        <div className={`h-2 w-2 rounded-full bg-white transition-transform duration-200 ${
          isDevMode ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </div>
    </div>
  );
};

export default DevModeToggle;
