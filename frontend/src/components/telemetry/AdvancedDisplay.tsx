import React, { useState, useRef, useEffect } from 'react';
import { TelemetryPacket, SimulatorFlags } from "@/types/telemetry";
import { Gauge, Flag, Fuel, Thermometer, Activity, Zap, AlertTriangle, TrendingUp, Timer } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { formatSpeed, formatLapTime } from '@/lib/utils';
import CarInfoDisplay from './CarInfoDisplay';

interface TelemetryDisplayProps {
    data: TelemetryPacket | null;
    isDevMode?: boolean;
}

interface LapData {
    fuelUsed: number; // Fuel percentage used in each lap
    lapTime: number; // Lap time in milliseconds
}

// Custom components
const CircularGauge = ({ value, max, label, unit, danger = false }: { value: number; max: number; label: string; unit: string; danger?: boolean }) => {
  const percentage = (value / max) * 100;
  const strokeDasharray = `${percentage * 2.51} 251`; // 251 is roughly the circumference for r=40
  
  return (
    <div className="relative w-32 h-32">
      <svg className="transform -rotate-90 w-32 h-32">
        <circle cx="64" cy="64" r="40" stroke="var(--tt-bg-card)" strokeWidth="8" fill="none" />
        <circle 
          cx="64" 
          cy="64" 
          r="40" 
          stroke={danger ? "var(--tt-status-error)" : percentage > 80 ? "var(--tt-status-warning)" : "var(--tt-status-info)"}
          strokeWidth="8" 
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-tt-text-primary">{value.toFixed(0)}</span>
        <span className="text-xs text-tt-text-secondary">{unit}</span>
        <span className="text-xs text-tt-text-gray-500 mt-1">{label}</span>
      </div>
    </div>
  );
};

const RPMGauge = ({ rpm, maxRpm, flashingRpm }: { rpm: number; maxRpm: number; flashingRpm: number }) => {
  const data = [{ value: (rpm / maxRpm) * 100, rpm }];
  const isFlashing = rpm >= flashingRpm;
  
  return (
    <div className="relative w-48 h-48">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={data} startAngle={180} endAngle={0}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar 
            dataKey="value" 
            cornerRadius={10} 
            fill={isFlashing ? "var(--tt-status-error)" : rpm > flashingRpm * 0.9 ? "var(--tt-status-warning)" : "var(--tt-status-info)"}
            className={isFlashing ? "animate-pulse" : ""}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-tt-text-primary">{Math.round(rpm)}</span>
        <span className="text-sm text-tt-text-secondary">RPM</span>
      </div>
    </div>
  );
};

const GForceIndicator = ({ velocity, angularVelocity }: { velocity: any; angularVelocity: any }) => {
  // simplfied g-force calculation for visualization
  const lateralG = Math.abs(velocity.x) / 9.81;
  const longitudinalG = Math.abs(velocity.z) / 9.81;
  
  return (
    <div className="relative w-32 h-32 bg-tt-gray-900 rounded-full">
      <div className="absolute inset-2 bg-tt-gray-800 rounded-full">
        <div className="absolute inset-4 bg-tt-gray-900 rounded-full">
          <div 
            className="absolute w-3 h-3 bg-tt-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100"
            style={{
              left: `${50 + lateralG * 30}%`,
              top: `${50 - longitudinalG * 30}%`
            }}
          />
        </div>
      </div>
      <div className="absolute -bottom-6 left-0 right-0 text-center">
        <span className="text-xs text-tt-text-secondary">G-Force</span>
      </div>
    </div>
  );
};

// TODO: make colors nicer and in line with standard display and telemetry display
const TireWidget = ({ temps }: { temps: { fl: number; fr: number; rl: number; rr: number } }) => {
    // taken straight from TyreTemperatures.tsx
  const getTemperatureHSL = (temp: number, adjust: number = 0): string => {
      let hue: number;
      if (temp < 60) {
          hue = 140 - ((temp / 60) * 20);
      } else if (temp < 80) {
          hue = 120 - (((temp - 60) / 20) * 60);
      } else if (temp < 100) {
          hue = 60 - (((temp - 80) / 20) * 60);
      } else {
          hue = 0; // hot
      }

      const saturation = 85;
      const lightness = 45 + adjust;

      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }; 
  
  const Tire = ({ temp, position }: { temp: number; position: string }) => (
    <div className="relative">
      <div 
        className="w-16 h-20 rounded-lg flex items-center justify-center transition-all duration-300"
        style={{ 
          backgroundColor: getTemperatureHSL(temp),
          boxShadow: `0 0 20px ${getTemperatureHSL(temp)}66`
        }}
      >
        <span className="text-white font-bold">{temp.toFixed(0)}°</span>
      </div>
      <span className="absolute -bottom-5 left-0 right-0 text-center text-xs text-tt-text-secondary">{position}</span>
    </div>
  );
  
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
      <Tire temp={temps.fl} position="FL" />
      <Tire temp={temps.fr} position="FR" />
      <Tire temp={temps.rl} position="RL" />
      <Tire temp={temps.rr} position="RR" />
    </div>
  );
};

// Main component
const TelemetryDisplay = ({ data, isDevMode = false }: TelemetryDisplayProps) => {
  // states for tracking lap data
    const [currentLapTime, setCurrentLapTime] = useState<number>(0);
    const [completedLaps, setCompletedLaps] = useState<LapData[]>([]);
    const [averageFuelPerLap, setAverageFuelPerLap] = useState<number>(0);
    const [averageLapTime, setAverageLapTime] = useState<number>(0);
    const [lapHistory, setLapHistory] = useState<any[]>([]);

    const [speedUnit, setSpeedUnit] = useState<'kph' | 'mph'>('kph');
    const prevLapForFuelRef = useRef<number>(0);
    const prevLapForTimingRef = useRef<number>(0);
    const lapStartTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number | null>(null);
    const accumulatedTimeRef = useRef<number>(0);
    const lastTickRef = useRef<number>(0);
    const wasOnTrackRef = useRef<boolean>(false);
    const wasPausedRef = useRef<boolean>(false);
    const wasLoadingRef = useRef<boolean>(false);
    // fuel data
    const startFuelRef = useRef<number>(100); // store starting fuel percentage
    const prevFuelRef = useRef<number>(data?.fuel_percentage || 100); // prevFuelRef for accurate avgFuelPerLap calculation
    const totalFuelConsumedRef = useRef<number>(0); // cumalative fuel used
    const fuelAddedThisLapRef = useRef<number>(0);
    const isInitializedRef = useRef<boolean>(false);

    // Initialize timestamps after component mounts to avoid hydration mismatch
    useEffect(() => {
        if (!isInitializedRef.current) {
            const now = Date.now();
            lapStartTimeRef.current = now;
            lastTickRef.current = now;
            isInitializedRef.current = true;
        }
    }, []);

    // continuous fuel monitoring useEffect
    // needed because of fuel refueling, which can happen at any point in race
    useEffect(() => {
        if (!data) return;

        // check for refueling 
        const currentFuelPercentage = data.fuel_percentage;

        if (currentFuelPercentage > prevFuelRef.current + 0.5) {
            const fuelAdded = currentFuelPercentage - prevFuelRef.current;
            fuelAddedThisLapRef.current = fuelAdded;
            // console.log(`Refuel detected: +${fuelAdded.toFixed(1)}%`);
        }

        prevFuelRef.current = currentFuelPercentage;

    }, [data?.fuel_percentage]); //only run when fuel percentage changes

    // lap completion useEffect
    useEffect(() => {
        if (!data) return;

        // check for race reset/restart
        if (data.current_lap === 1 && prevLapForFuelRef.current > 1) {
            // reset lap/average data
            setCompletedLaps([]);
            setAverageFuelPerLap(0);
            setAverageLapTime(0);
            setLapHistory([]);
            startFuelRef.current = data.fuel_percentage;
            totalFuelConsumedRef.current = 0;
            fuelAddedThisLapRef.current = 0;
            prevFuelRef.current = data.fuel_percentage;
        }
        // detect lap completion
        if (data.current_lap > 0 && data.current_lap !== prevLapForFuelRef.current) {

            const fuelUsedThisLap = (startFuelRef.current + fuelAddedThisLapRef.current) - data.fuel_percentage;

            if (fuelUsedThisLap > 0) {
                totalFuelConsumedRef.current += fuelUsedThisLap;

                // add new lap data
                const newLapData: LapData = {
                    fuelUsed: fuelUsedThisLap,
                    lapTime: data.last_lap_time
                }

                // update completed laps
                setCompletedLaps(prev => {
                    const newLaps = [...prev, newLapData];

                    // calculate avg from all valid laps (exclude laps with zero fuel usage)
                    const validLaps = newLaps.filter(lap => lap.fuelUsed > 0);
                    const lapCount = validLaps.length;

                    const avgFuel = lapCount > 0
                        ? newLaps.reduce((sum, lap) => sum + lap.fuelUsed, 0) / lapCount
                        : 0;

                    const avgTime = lapCount > 0
                        ? newLaps.reduce((sum, lap) => sum + lap.lapTime, 0) / lapCount
                        : 0;

                    setAverageFuelPerLap(avgFuel);
                    setAverageLapTime(avgTime);

                    return newLaps;
                });
            }

            // Update lap history for chart display
            if (data.last_lap_time > 0) {
                setLapHistory(prev => {
                    const newHistory = [...prev.slice(-4), {
                        lap: data.current_lap - 1,
                        time: data.last_lap_time / 1000,
                        fuel: fuelUsedThisLap
                    }];
                    return newHistory;
                });
            }

            // reset starting fuel for next lap
            prevLapForFuelRef.current = data.current_lap;
            startFuelRef.current = data.fuel_percentage;
            fuelAddedThisLapRef.current = 0;
        }
    }, [data?.fuel_percentage, data?.last_lap_time, data?.current_lap]);

    // lap timing useEffect
    useEffect(() => {
        if (!data) return;

        // check flags for accurate 'current lap time' detection 
        const isOnTrack = Boolean(data.flags & (1 << 0));
        const isPaused = Boolean(data.flags & (1 << 1));
        const isLoading = Boolean(data.flags & (1 << 2));

        // handle race restart detection via loading flag
        // if loading detected, reset the timer as it indicates a restart
        if (isLoading && !wasLoadingRef.current) {
            accumulatedTimeRef.current = 0;
            setCurrentLapTime(0);
            lapStartTimeRef.current = Date.now();
            lastTickRef.current = Date.now();
            prevLapForTimingRef.current = 0;
        }

        // handle race quit detection
        // if player was on track and now isn't, player probably quit
        if (wasOnTrackRef.current && !isOnTrack) {
            // thus restart lap timer state
            accumulatedTimeRef.current = 0;
            setCurrentLapTime(0);
            lapStartTimeRef.current = Date.now();
            prevLapForTimingRef.current = 0; // <--- Reset new ref
        }

        wasOnTrackRef.current = isOnTrack;
        wasLoadingRef.current = isLoading;

        // handle lap changes only when on track
        if (isOnTrack && data.current_lap > 0 && data.current_lap !== prevLapForTimingRef.current) {
            accumulatedTimeRef.current = 0;
            setCurrentLapTime(0.001);
            lapStartTimeRef.current = Date.now();
            lastTickRef.current = Date.now();
            prevLapForTimingRef.current = data.current_lap;
        }


        // handle pause state changes
        if (isPaused !== wasPausedRef.current) {
            if (isPaused) {
                // just paused, safe accumalated time
                accumulatedTimeRef.current += Date.now() - lastTickRef.current;
            } else {
                // just unpaused, update last tick time
                lastTickRef.current = Date.now();
            }
            wasPausedRef.current = isPaused;
        }

        // update lap time (ONLY when on track AND game is not paused)
        const updateLapTime = () => {
            if (isOnTrack && data.current_lap > 0 && !isPaused) {
                const currentTick = Date.now();
                const elapsedSinceLastTick = currentTick - lastTickRef.current;
                lastTickRef.current = currentTick

                // add new elapsed time to accumulated time
                accumulatedTimeRef.current += elapsedSinceLastTick;
                setCurrentLapTime(accumulatedTimeRef.current);
            }
            animationFrameRef.current = requestAnimationFrame(updateLapTime);
        };

        animationFrameRef.current = requestAnimationFrame(updateLapTime);

        // cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [data?.current_lap, data?.flags]);

    if (!data) {
        return null;
    }

    const formattedSpeed = formatSpeed(data.speed_mps, speedUnit);
    const suggestedGear = data.suggested_gear !== 15 ? data.suggested_gear : null; // 15 == no suggested gear
    const currentLap = data.current_lap;
    const totalLaps = data.total_laps;
    const currentPosition = data.current_position;
    const totalPositions = data.total_positions;
    const fuelPercentage = data.fuel_percentage;
    const isTrial = totalLaps == 0; // if total laps is 0 it is a time/drift trial
    const estimatedLapsRemaining = averageFuelPerLap > 0 ? data?.fuel_percentage / averageFuelPerLap : 0;
  
  const isOnTrack = Boolean(data.flags & SimulatorFlags.CAR_ON_TRACK);
  const hasTurbo = Boolean(data.flags & SimulatorFlags.HAS_TURBO);
  const speed = Number(formatSpeed(data.speed_mps, speedUnit));
  const throttlePercent = ((data.throttle / 255) * 100);
  const brakePercent = ((data.brake / 255) * 100);
  
  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
      {/* Header with car info */}
      <div className="bg-tt-gray-900 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {data.car_info && (
            <>
              <div className="w-48 h-27 bg-tt-black rounded-lg overflow-hidden">
                <img 
                  src={data.car_info.image_url} 
                  alt={data.car_info.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-tt-text-primary">{data.car_info.maker_name}</h2>
                <p className="text-tt-text-secondary">{data.car_info.name}</p>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-2 rounded-full text-sm ${isOnTrack ? 'bg-tt-status-success' : 'bg-tt-gray-600'} text-tt-text-primary`}>
            {isOnTrack ? 'ON TRACK' : 'OFF TRACK'}
          </span>
        </div>
      </div>
      
      {/* Main dashboard grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column - Primary gauges */}
        <div className="space-y-4">
          {/* Speed and RPM */}
          <div className="bg-tt-gray-900 rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-tt-text-primary">
                <Gauge className="w-5 h-5" />
                Performance
              </h3>
              <button 
                onClick={() => setSpeedUnit(speedUnit === 'kph' ? 'mph' : 'kph')}
                className="text-sm px-2 py-1 bg-tt-gray-800 rounded hover:bg-tt-gray-700 transition-colors text-tt-text-primary"
              >
                {speedUnit.toUpperCase()}
              </button>
            </div>
            
            <div className="flex justify-around items-center">
              <CircularGauge 
                value={Number(formattedSpeed.slice(0,formattedSpeed.length - 4))} 
                max={speedUnit === 'kph' ? 500 : 320} 
                label="Speed" 
                unit={speedUnit.toUpperCase()} 
              />
              <RPMGauge 
                rpm={data.engine_rpm} 
                maxRpm={data.rpm_hit} 
                flashingRpm={data.rpm_flashing} 
              />
            </div>
            
            {/* Gear indicator */}
            <div className="text-center">
              <div className="inline-flex items-center gap-3 bg-tt-gray-800 rounded-lg px-6 py-3">
                <span className="text-6xl font-bold text-tt-text-primary">{data.current_gear}</span>
                {data.suggested_gear !== 15 && data.suggested_gear !== data.current_gear && (
                  <div className="flex flex-col items-center animate-pulse">
                    <TrendingUp className="w-6 h-6 text-tt-green-400" />
                    <span className="text-2xl font-bold text-tt-green-400">{data.suggested_gear}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Throttle and Brake bars */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-tt-text-secondary w-12">THR</span>
                <div className="flex-1 h-4 bg-tt-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-tt-green-500 transition-all duration-100"
                    style={{ width: `${throttlePercent}%` }}
                  />
                </div>
                <span className="text-xs text-tt-text-secondary w-10 text-right">{throttlePercent.toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-tt-text-secondary w-12">BRK</span>
                <div className="flex-1 h-4 bg-tt-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-tt-red-500 transition-all duration-100"
                    style={{ width: `${brakePercent}%` }}
                  />
                </div>
                <span className="text-xs text-tt-text-secondary w-10 text-right">{brakePercent.toFixed(0)}%</span>
              </div>
            </div>
          </div>
          
          {/* G-Force and dynamics */}
          <div className="bg-tt-gray-900 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-tt-text-primary">
              <Activity className="w-5 h-5" />
              Dynamics
            </h3>
            <div className="flex justify-around items-center">
              <GForceIndicator velocity={data.velocity} angularVelocity={data.angular_velocity} />
              {hasTurbo && (
                <CircularGauge 
                  value={(data.turbo_boost - 1) * 100} 
                  max={100} 
                  label="Boost" 
                  unit="kPa" 
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Middle column - Race info and lap times */}
        <div className="space-y-4">
          {/* Position and lap info */}
          <div className="bg-tt-gray-900 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-tt-text-primary">
              <Flag className="w-5 h-5" />
              Race Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-tt-gray-800 rounded-lg">
                <p className="text-3xl p-1 font-bold text-tt-blue-400">{data.current_position}/{data.total_positions}</p>
                <p className="text-sm text-tt-text-secondary">Position</p>
              </div>
              <div className="text-center p-4 bg-tt-gray-800 rounded-lg">
                <p className="text-3xl p-1 font-bold text-tt-text-primary">{data.current_lap}/{data.total_laps}</p>
                <p className="text-sm text-tt-text-secondary">Lap</p>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center p-2 bg-tt-gray-800 rounded">
                <span className="text-sm text-tt-text-secondary">Current Lap</span>
                <span className="font-mono font-bold text-tt-text-primary">{formatLapTime(currentLapTime)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-tt-gray-800 rounded">
                <span className="text-sm text-tt-text-secondary">Best Lap</span>
                <span className="font-mono font-bold text-purple-400">{formatLapTime(data.best_lap_time)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-tt-gray-800 rounded">
                <span className="text-sm text-tt-text-secondary">Last Lap</span>
                <span className="font-mono font-bold text-tt-green-400">{formatLapTime(data.last_lap_time)}</span>
              </div>
            </div>
          </div>
          
          {/* Lap time chart */}
          {lapHistory.length > 0 && (
            <div className="bg-tt-gray-900 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-tt-text-primary">
                <Timer className="w-5 h-5" />
                Lap Times
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lapHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--tt-gray-700)" />
                    <XAxis dataKey="lap" stroke="var(--tt-text-gray-400)" />
                    <YAxis stroke="var(--tt-text-gray-400)" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--tt-gray-800)', border: 'none', borderRadius: '8px' }}
                      formatter={(value: any) => `${value.toFixed(3)}s`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="time" 
                      stroke="var(--tt-blue-500)" 
                      strokeWidth={2}
                      dot={{ fill: 'var(--tt-blue-500)', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
        
        {/* Right column - Car status */}
        <div className="space-y-4">
          {/* Temperatures */}
          <div className="bg-tt-gray-900 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-tt-text-primary">
              <Thermometer className="w-5 h-5" />
              Temperatures
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-tt-text-secondary">Water</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-tt-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-tt-blue-500 transition-all duration-300"
                      style={{ width: `${(data.water_temp / 120) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono w-12 text-tt-text-primary">{data.water_temp.toFixed(0)}°C</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-tt-text-secondary">Oil</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-tt-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-tt-yellow-500 transition-all duration-300"
                      style={{ width: `${(data.oil_temp / 150) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono w-12 text-tt-text-primary">{data.oil_temp.toFixed(0)}°C</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tires */}
          <div className="bg-tt-gray-900 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-tt-text-primary">
              <Zap className="w-5 h-5" />
              Tire Status
            </h3>
            <div className="flex justify-center">
              <TireWidget temps={{
                fl: data.tire_temp_fl,
                fr: data.tire_temp_fr,
                rl: data.tire_temp_rl,
                rr: data.tire_temp_rr
              }} />
            </div>
          </div>
          
          {/* Fuel */}
          <div className="bg-tt-gray-900 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-tt-text-primary">
              <Fuel className="w-5 h-5" />
              Fuel Management
            </h3>
            <div className="space-y-3">
              <div className="relative h-12 bg-tt-gray-800 rounded-lg overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-tt-red-500 to-tt-blue-400 transition-all duration-300"
                  style={{ width: `${data.fuel_percentage}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-bold text-tt-text-primary">{data.fuel_percentage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-tt-gray-800 rounded p-2">
                  <p className="text-tt-text-secondary">Remaining</p>
                  <p className="font-bold text-tt-text-primary">{data.current_fuel.toFixed(1)}L</p>
                </div>
                <div className="bg-tt-gray-800 rounded p-2">
                  <p className="text-tt-text-secondary">Per Lap</p>
                  {/* <p className="font-bold">{data.fuel_consumption_lap.toFixed(1)}L</p> */}
                </div>
              </div>
              {data.fuel_percentage < 20 && (
                <div className="flex items-center gap-2 text-tt-yellow-400 text-sm animate-pulse">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Low fuel warning!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelemetryDisplay;