import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TelemetryPacket } from "@/types/telemetry";
import {
    Activity, Droplet, Clock, ChevronRight, RotateCw,
    Zap, Gauge, Flag, Fuel, Thermometer
} from 'lucide-react';
import { formatLapTime, formatSpeed } from '@/lib/utils';
import { COLORS, VISUALIZATION_COLORS } from '@/lib/theme';
import CarInfoDisplay from './CarInfoDisplay';
import TyreTemperatures from './TyreTemperatures';

interface CircularGaugeProps {
  value: number;
  max: number;
  title: string;
  unit: string;
  icon: React.ReactNode;
  colorClass?: string;
}

interface TelemetryDisplayProps {
    data: TelemetryPacket | null;
    isDevMode?: boolean;
}

interface LapData {
    fuelUsed: number; // Fuel percentage used in each lap
    lapTime: number; // Lap time in milliseconds
}

const RPMBar = ({ rpm, rpmFlashing, rpmHit }: { rpm: number; rpmFlashing: number; rpmHit: number }) => {

    const adjustedRpmHit = rpmHit - (rpmHit * 0.08); // 2% buffer so it can reach the end of the bar
    const percentage = (rpm / adjustedRpmHit) * 100; // percentage of current RPM relative to redline
    const warningThreshold = (rpmFlashing / rpmHit) * 100;     // calculate warning threshold percentage

    const getColor = (percent: number) => {
        let hue;
        if (percent < 50) {
            // Blue to Green (210 -> 120)
            hue = 210 - ((percent / 50) * 90);
        } else if (percent < 75) {
            // Green to Yellow (120 -> 60)
            hue = 120 - ((percent - 50) / 25) * 60;
        } else {
            // Yellow to Red (60 -> 0)
            hue = 60 - ((percent - 75) / 25) * 60;
        }
        return `hsl(${hue}, 90%, 50%)`;
    };


    // determine if RPM is in flashing range
    const isFlashing = rpm >= rpmFlashing;

    return (
        <div className='w-full h-2 bg-tt-bg-dark rounded-full overflow-hidden relative'>
            <div
                className={`h-full ${isFlashing ? 'animate-[revFlash_0.1s_ease-in-out_infinite]' : ''}`}
                style={{
                    width: `${Math.min(100, percentage)}%`,
                    background: isFlashing ? undefined : getColor(percentage),
                }}
            />
        </div>
    );
}

const CircularGauge = ({ value, max, title, unit, icon, colorClass = "text-tt-blue-400" }: CircularGaugeProps) => {
  const percentage = (value / max) * 100;
  const circumference = 2 * Math.PI * 38; // r = 38
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        {/* Background circle */}
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle 
            cx="50" 
            cy="50" 
            r="38" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="8"
            className="text-tt-bg-accent opacity-30"
          />
          {/* Foreground circle */}
          <circle 
            cx="50" 
            cy="50" 
            r="38" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="8"
            className={colorClass}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
          />
        </svg>
        
        {/* Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {icon}
        </div>
      </div>
      
      <div className="mt-2 text-center">
        <p className="text-tt-text-secondary text-xs font-medium">{title}</p>
        <p className="text-tt-text-primary text-lg font-bold">{value} <span className="text-xs text-tt-text-secondary">{unit}</span></p>
      </div>
    </div>
  );
};

// Throttle/Brake Bar
const PedalBar = ({ value, type }: { value: number; type: 'throttle' | 'brake' }) => {
    const percent = (value / 255) * 100;
    const barColor = type === 'throttle' ? 'bg-tt-blue-500' : 'bg-tt-red-500';

    return (
        <div className='flex items-center'>
            <div className='w-16 flex justify-end'>
                <span className='text-xs text-tt-text-secondary'>{type === 'throttle' ? 'T' : 'B'}</span>
            </div>
            <div className='w-full h-3 bg-tt-bg-dark rounded-md overflow-hidden mx-2'>
                <div
                    className={`h-full ${barColor}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
            <div className="text-xs w-12 text-right">
                {percent.toFixed(0)}%
            </div>
        </div>
    );
};

const StandardDisplay = ({ data, isDevMode = false }: TelemetryDisplayProps) => {
    // states for tracking lap data
    const [currentLapTime, setCurrentLapTime] = useState<number>(0);
    const [completedLaps, setCompletedLaps] = useState<LapData[]>([]);
    const [averageFuelPerLap, setAverageFuelPerLap] = useState<number>(0);
    const [averageLapTime, setAverageLapTime] = useState<number>(0);

    const [speedUnit, setSpeedUnit] = useState<'kph' | 'mph'>('kph');
    const prevLapForFuelRef = useRef<number>(0);
    const prevLapForTimingRef = useRef<number>(0);
    const lapStartTimeRef = useRef<number>(Date.now());
    const animationFrameRef = useRef<number | null>(null);
    const accumulatedTimeRef = useRef<number>(0);
    const lastTickRef = useRef<number>(Date.now());
    const wasOnTrackRef = useRef<boolean>(false);
    const wasPausedRef = useRef<boolean>(false);
    const wasLoadingRef = useRef<boolean>(false);
    // fuel data
    const startFuelRef = useRef<number>(100); // store starting fuel percentage
    const prevFuelRef = useRef<number>(data?.fuel_percentage || 100); // prevFuelRef for accurate avgFuelPerLap calculation
    const totalFuelConsumedRef = useRef<number>(0); // cumalative fuel used
    const fuelAddedThisLapRef = useRef<number>(0);

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
    const throttlePercent = ((data.throttle / 255) * 100).toFixed(1);
    const brakePercent = ((data.brake / 255) * 100).toFixed(1);
    const suggestedGear = data.suggested_gear !== 15 ? data.suggested_gear : null; // 15 == no suggested gear
    const currentLap = data.current_lap;
    const totalLaps = data.total_laps;
    const currentPosition = data.current_position;
    const totalPositions = data.total_positions;
    const fuelPercentage = data.fuel_percentage;
    const currentFuel = data.current_fuel;
    const fuelCapacity = data.fuel_capacity;
    const isTrial = totalLaps == 0; // if total laps is 0 it is a time/drift trial
    const estimatedLapsRemaining = averageFuelPerLap > 0 ? data?.fuel_percentage / averageFuelPerLap : 0;

    return (
        // <div className="w-full max-w-7xl mx-auto rounded-lg overflow-hidden bg-tt-bg-dark text-tt-text-primary p-4">
        <div className="w-full mx-auto rounded-lg overflow-hidden bg-tt-bg-dark text-tt-text-primary p-4">
            {/* main dashboard area, grid layout */}
            <div className='grid grid-cols-12 gap-4'>
                {/* left column with primary engine data */}
                <div className='col-span-8 space-y-4'>
                    <div className='bg-tt-bg-card rounded-lg p-4'>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-md font-medium text-tt-text-secondary flex items-center">
                                <Zap className="w-4 h-4 mr-1 text-tt-red-400" /> ENGINE
                            </h3>
                        </div>
                        {/* RPM BAR */}
                        <div className='flex items-center gap-2'>
                            <RPMBar
                                rpm={data.engine_rpm}
                                rpmFlashing={data.rpm_flashing}
                                rpmHit={data.rpm_hit}
                            />
                            <span className="text-sm font-bold min-w-[80px] text-right text-tt-text-primary">
                                {Math.round(data.engine_rpm)} RPM
                            </span>
                        </div>
                        {/* <div className="col-span-3 space-y-3"> */}
                        <div className="grid grid-cols-3 mt-6 gap-20">
                            {/* Speed + Gear Telemetry */}
                            <div className="text-center">
                                <p className="text-xs text-tt-text-secondary">SPEED</p>
                                <p className="text-2xl font-bold">{(data.speed_mps * 3.6).toFixed(1)}</p>
                                <p className="text-xs text-tt-text-secondary">KPH</p>
                            </div>
                            <div className="text-center relative">
                                <p className="text-xs text-tt-text-secondary">GEAR</p>
                                <p className="text-7xl font-bold">{data.current_gear}</p>
                                {data.suggested_gear !== data.current_gear && (
                                    <div className="absolute -right-1 bottom-1 bg-tt-red-500 text-white text-sm font-bold rounded px-1.5 py-0.5 shadow-md">
                                        {data.suggested_gear}
                                    </div>
                                )}
                            </div>
                            {/* Throttle and Brake Horizontal Bars */}
                            <div className="space-y-4 pt-4">
                                <PedalBar value={data.throttle} type="throttle" />
                                <PedalBar value={data.brake} type="brake" />
                            </div>
                        </div>
                    </div>
                    {/* Lap Info and Position */}
                    <div className='bg-tt-bg-card rounded-lg p-4'>

                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-md font-medium text-tt-text-secondary flex items-center">
                                <Flag className="w-4 h-4 mr-1 text-tt-blue-400" /> RACE INFO
                            </h3>
                        </div>

                        <div className="flex items-center justify-center my-2">
                            <div className="text-center bg-tt-bg-dark rounded-xl px-8 py-3">
                                <div className="flex items-center justify-center gap-8">
                                    {/* Position */}
                                    <div className="w-32 flex flex-col items-center">
                                        <p className="text-md text-tt-text-secondary">POSITION</p>
                                        <div className="flex items-baseline justify-center">
                                            <span className="text-4xl font-bold text-tt-blue-400">{data.current_position}</span>
                                            <span className="text-lg text-tt-text-secondary">/{data.total_positions}</span>
                                        </div>
                                    </div>
                                    {/* Divider */}
                                    <div className="h-12 w-px bg-tt-bg-accent opacity-40 mx-4" />
                                    {/* Laps */}
                                    <div className="w-32 flex flex-col items-center">
                                        <p className="text-md text-tt-text-secondary">LAP</p>
                                        <div className="flex items-baseline justify-center">
                                            <span className="text-4xl font-bold text-tt-red-400">{data.current_lap}</span>
                                            <span className="text-lg text-tt-text-secondary">/{data.total_laps}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Lap Times */}
                        <div className="grid grid-cols-3 gap-4 mt-3">
                            <div className="text-center">
                                <p className="text-md text-tt-text-secondary">LAST LAP</p>
                                <p className="text-xl font-mono font-bold">{formatLapTime(data.last_lap_time)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-md text-tt-text-secondary">CURRENT</p>
                                <p className="text-xl font-mono font-bold text-tt-blue-400">{formatLapTime(currentLapTime)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-md text-tt-text-secondary">BEST</p>
                                <p className="text-xl font-mono font-bold text-tt-status-success">{formatLapTime(data.best_lap_time)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StandardDisplay;