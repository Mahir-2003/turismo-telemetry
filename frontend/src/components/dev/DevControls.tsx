import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Sliders, PlaySquare, RotateCcw, Save, Download, Settings } from 'lucide-react';
import mockTelemetryGenerator from '@/lib/mockTelemetry';

interface DevControlsProps {
  isVisible: boolean;
}

interface ControlConfig {
  name: string;
  min: number;
  max: number;
  step: number;
  field: string;
  unit: string;
  multiplier?: number;
}

const DevControls: React.FC<DevControlsProps> = ({ isVisible }) => {
  const [expanded, setExpanded] = useState<boolean>(false);
  
  const [speed, setSpeed] = useState<number>(0);
  const [rpm, setRpm] = useState<number>(0);
  const [throttle, setThrottle] = useState<number>(0);
  const [brake, setBrake] = useState<number>(0);
  const [gear, setGear] = useState<number>(0);
  const [fuel, setFuel] = useState<number>(75.5);
  const [currentLap, setCurrentLap] = useState<number>(1);
  
  const [savedConfigs, setSavedConfigs] = useState<{name: string, data: any}[]>([]);

  // Set initial values on first render
  useEffect(() => {
    // Subscribe to mock telemetry updates
    const unsubscribe = mockTelemetryGenerator.subscribe((data) => {
      setSpeed(data.speed_mps);
      setRpm(data.engine_rpm);
      setThrottle(data.throttle);
      setBrake(data.brake);
      setGear(data.current_gear);
      setFuel(data.fuel_percentage);
      setCurrentLap(data.current_lap);
    });

    // Load saved configs from local storage
    const savedConfigsStr = localStorage.getItem('turismoTelemetrySavedConfigs');
    if (savedConfigsStr) {
      try {
        setSavedConfigs(JSON.parse(savedConfigsStr));
      } catch (e) {
        console.error('Error loading saved configs:', e);
      }
    }

    // Clean up subscription
    return unsubscribe;
  }, []);

  // Update telemetry values when a control changes
  const handleControlChange = (field: string, value: number, multiplier: number = 1) => {
    const updates: any = {
      [field]: value * multiplier
    };

    // Handle special cases
    if (field === 'speed_mps') {
      setSpeed(value);
    } else if (field === 'engine_rpm') {
      setRpm(value);
    } else if (field === 'throttle') {
      setThrottle(value);
    } else if (field === 'brake') {
      setBrake(value);
    } else if (field === 'current_gear') {
      setGear(value);
    } else if (field === 'fuel_percentage') {
      setFuel(value);
      // Update current_fuel based on percentage
      updates.current_fuel = (value / 100) * 65; // Assuming 65L capacity
    } else if (field === 'current_lap') {
      setCurrentLap(value);
    }

    mockTelemetryGenerator.updateValues(updates);
  };

  // Run a predefined scenario
  const runScenario = (scenarioName: string) => {
    mockTelemetryGenerator.runScenario(scenarioName);
  };

  // Reset to default state
  const resetTelemetry = () => {
    mockTelemetryGenerator.reset();
  };

  // Save current configuration
  const saveCurrentConfig = () => {
    const configName = prompt('Enter a name for this configuration:');
    if (configName) {
      const newConfig = {
        name: configName,
        data: {
          speed_mps: speed,
          engine_rpm: rpm,
          throttle,
          brake,
          current_gear: gear,
          fuel_percentage: fuel,
          current_lap: currentLap,
        }
      };
      
      const updatedConfigs = [...savedConfigs, newConfig];
      setSavedConfigs(updatedConfigs);
      localStorage.setItem('turismoTelemetrySavedConfigs', JSON.stringify(updatedConfigs));
    }
  };

  // Load a saved configuration
  const loadConfig = (config: any) => {
    mockTelemetryGenerator.updateValues(config.data);
  };

  // Delete a saved configuration
  const deleteConfig = (index: number) => {
    const updatedConfigs = savedConfigs.filter((_, i) => i !== index);
    setSavedConfigs(updatedConfigs);
    localStorage.setItem('turismoTelemetrySavedConfigs', JSON.stringify(updatedConfigs));
  };

  if (!isVisible) {
    return null;
  }

  // Slider controls configuration
  const controls: ControlConfig[] = [
    { name: 'Speed', min: 0, max: 100, step: 0.1, field: 'speed_mps', unit: 'm/s' },
    { name: 'RPM', min: 0, max: 9000, step: 100, field: 'engine_rpm', unit: 'RPM' },
    { name: 'Throttle', min: 0, max: 255, step: 1, field: 'throttle', unit: '' },
    { name: 'Brake', min: 0, max: 255, step: 1, field: 'brake', unit: '' },
    { name: 'Gear', min: 0, max: 6, step: 1, field: 'current_gear', unit: '' },
    { name: 'Fuel', min: 0, max: 100, step: 0.5, field: 'fuel_percentage', unit: '%' },
    { name: 'Current Lap', min: 1, max: 20, step: 1, field: 'current_lap', unit: '' },
  ];

  // Predefined scenarios
  const scenarios = [
    { name: 'Race Start', id: 'race_start' },
    { name: 'Cornering', id: 'cornering' },
    { name: 'Pit Stop', id: 'pit_stop' },
    { name: 'Hard Braking', id: 'hard_braking' },
    { name: 'High Speed', id: 'high_speed' },
  ];

  return (
    <div className={`fixed ${expanded ? 'w-96 right-4' : 'w-12 right-16'} top-16 bottom-4 z-40 transition-all duration-300 ${expanded ? 'p-2' : 'p-0'}`}>
      {/* Toggle button */}
      <button 
        className="absolute -left-8 top-2 bg-tt-bg-card border-2 border-tt-bg-accent rounded-l-lg p-2 z-50"
        onClick={() => setExpanded(!expanded)}
        title={expanded ? 'Collapse Controls' : 'Expand Controls'}
      >
        <Settings size={16} className="text-tt-text-secondary" />
      </button>

      <Card className={`w-full h-full bg-tt-bg-card border-tt-bg-accent overflow-y-auto transition-all duration-300 ${expanded ? 'opacity-100' : 'opacity-0'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-tt-text-primary">
            <Sliders className="h-5 w-5 text-tt-blue-400" />
            Telemetry Dev Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="space-y-6">
            {/* Controls section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-tt-text-secondary">Telemetry Controls</h3>
              
              {controls.map((control) => (
                <div key={control.field} className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs font-medium text-tt-text-primary">
                      {control.name}
                    </label>
                    <span className="text-xs text-tt-text-secondary">
                      {(() => {
                        switch (control.field) {
                          case 'speed_mps': return `${speed.toFixed(1)} ${control.unit}`;
                          case 'engine_rpm': return `${rpm.toFixed(0)} ${control.unit}`;
                          case 'throttle': return `${throttle} (${((throttle / 255) * 100).toFixed(0)}%)`;
                          case 'brake': return `${brake} (${((brake / 255) * 100).toFixed(0)}%)`;
                          case 'current_gear': return gear === 0 ? 'N' : gear;
                          case 'fuel_percentage': return `${fuel.toFixed(1)}${control.unit}`;
                          case 'current_lap': return currentLap;
                          default: return '';
                        }
                      })()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    value={(() => {
                      switch (control.field) {
                        case 'speed_mps': return speed;
                        case 'engine_rpm': return rpm;
                        case 'throttle': return throttle;
                        case 'brake': return brake;
                        case 'current_gear': return gear;
                        case 'fuel_percentage': return fuel;
                        case 'current_lap': return currentLap;
                        default: return 0;
                      }
                    })()}
                    onChange={(e) => handleControlChange(control.field, parseFloat(e.target.value), control.multiplier)}
                    className="w-full h-2 bg-tt-bg-dark rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {/* Scenario buttons */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-tt-text-secondary">Scenarios</h3>
              <div className="grid grid-cols-2 gap-2">
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    className="flex items-center justify-center gap-1 p-2 bg-tt-bg-dark hover:bg-tt-blue-500 text-tt-text-primary hover:text-white rounded-md transition-colors text-xs"
                    onClick={() => runScenario(scenario.id)}
                  >
                    <PlaySquare size={12} />
                    {scenario.name}
                  </button>
                ))}
                <button
                  className="flex items-center justify-center gap-1 p-2 bg-tt-bg-dark hover:bg-tt-red-500 text-tt-text-primary hover:text-white rounded-md transition-colors text-xs col-span-2"
                  onClick={resetTelemetry}
                >
                  <RotateCcw size={12} />
                  Reset Telemetry
                </button>
              </div>
            </div>

            {/* Saved configurations */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-tt-text-secondary">Saved Configurations</h3>
                <button
                  className="flex items-center gap-1 p-1 bg-tt-bg-dark hover:bg-tt-blue-500 text-tt-text-primary hover:text-white rounded-md transition-colors text-xs"
                  onClick={saveCurrentConfig}
                >
                  <Save size={12} />
                  Save Current
                </button>
              </div>
              
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {savedConfigs.length === 0 ? (
                  <p className="text-xs text-tt-text-secondary italic">No saved configurations</p>
                ) : (
                  savedConfigs.map((config, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-tt-bg-dark rounded-md">
                      <span className="text-xs text-tt-text-primary truncate max-w-[120px]">{config.name}</span>
                      <div className="flex gap-1">
                        <button
                          className="p-1 hover:bg-tt-blue-500 text-tt-text-secondary hover:text-white rounded transition-colors"
                          onClick={() => loadConfig(config)}
                          title="Load configuration"
                        >
                          <Download size={12} />
                        </button>
                        <button
                          className="p-1 hover:bg-tt-red-500 text-tt-text-secondary hover:text-white rounded transition-colors"
                          onClick={() => deleteConfig(index)}
                          title="Delete configuration"
                        >
                          <RotateCcw size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DevControls;
