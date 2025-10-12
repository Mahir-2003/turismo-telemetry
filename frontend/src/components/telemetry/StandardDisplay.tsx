import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TelemetryPacket } from "@/types/telemetry";
import {
    Activity, Droplet, Clock, ChevronRight, RotateCw,
    Zap, Gauge, Flag, Fuel, Thermometer, Timer
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatLapTime, formatSpeed } from '@/lib/utils';
import CarInfoDisplay from './CarInfoDisplay';

interface CircularGaugeProps {
    value: string;
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
    const percentage = (Number(value) / max) * 100;
    const circumference = 2 * Math.PI * 42; // r = 42, increased from 38
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-32 h-32">
                {/* Background circle */}
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="circularGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="var(--tt-blue-500)" />
                            <stop offset="100%" stopColor="var(--tt-red-500)" />
                        </linearGradient>
                    </defs>
                    <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-tt-bg-accent opacity-30"
                    />
                    {/* Foreground circle */}
                    <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="url(#circularGradient)"
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        transform="rotate(-90 50 50)"
                    />
                </svg>

                {/* Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="transform scale-125">
                        {icon}
                    </div>
                </div>
            </div>

            <div className="mt-3 text-center">
                <p className="text-tt-text-secondary text-md font-medium">{title}</p>
                <p className="text-tt-text-primary text-2xl font-bold">{value} <span className="text-2xl text-tt-text-secondary">{unit}</span></p>
            </div>
        </div>
    );
};

// Throttle/Brake Bar
const PedalBar = ({ value, type }: { value: number; type: 'throttle' | 'brake' }) => {
    const percent = (value / 255) * 100;
    const barColor = type === 'throttle' ? 'bg-tt-blue-500' : 'bg-tt-red-500';

    return (
        <div className='flex items-center w-full'>
            <div className='w-8 flex justify-center'>
                <span className='text-xs text-tt-text-secondary'>{type === 'throttle' ? 'T' : 'B'}</span>
            </div>
            <div className='flex-1 h-3 bg-tt-bg-dark rounded-md overflow-hidden mx-1'>
                <div
                    className={`h-full ${barColor}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
            <div className="text-xs w-8 text-right">
                {percent.toFixed(0)}%
            </div>
        </div>
    );
};

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

// Function to determine text color based on background lightness
const getTextColor = (temp: number): string => {
    // For lighter backgrounds (yellow/green range), use dark text
    // For darker backgrounds (blue/red range), use light text
    if (temp >= 60 && temp < 100) {
        // Yellow/green range - these are lighter, use dark text
        return '#000000';
    } else {
        // Blue and red ranges - these are darker, use light text
        return '#FFFFFF';
    }
};


// Tire Component from TyreTemperatures modified for this display
const TireTemp = ({ position, temp }: { position: string, temp: number }) => {
    const color = getTemperatureHSL(temp);

    return (
        <div className="flex flex-col items-center">
            <div
                className={`w-20 h-32 rounded-lg flex items-center justify-center duration-300 ease-in-out border-2`}
                // FOR REF: transition used to be from 0% to 50% to 100%, removed gradient for consistency with rest of UI
                style={{
                    background: `linear-gradient(to bottom,
                        ${getTemperatureHSL(temp, 10)} 100%,
                        ${getTemperatureHSL(temp)} 100%,
                        ${getTemperatureHSL(temp, -10)} 100%
                    )`,
                    boxShadow: `
                        0 4px 6px -1px ${getTemperatureHSL(temp, -20)}80,
                        0 2px 4px -2px ${getTemperatureHSL(temp)}40,
                        inset 0 2px 4px ${getTemperatureHSL(temp, 15)}40
                    `,
                    transition: 'all 300ms ease-in-out',
                }}
            >
                <span 
                    className="text-lg font-bold"
                    style={{ color: getTextColor(temp) }}
                >
                    {temp.toFixed(1)}°
                </span>
            </div>
            <p className="text-sm mt-1 text-tt-text-secondary">{position}</p>
        </div>
    );
};

const StandardDisplay = ({ data, isDevMode = false }: TelemetryDisplayProps) => {
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

    // init timestamps after component mounts to avoid hydration mismatch
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

    return (
        // <div className="w-full max-w-7xl mx-auto rounded-lg overflow-hidden bg-tt-bg-dark text-tt-text-primary p-4">
        <div className="w-full mx-auto rounded-lg overflow-hidden text-tt-text-primary p-4">
            {/* main dashboard area, grid layout */}
            <div className='grid grid-cols-12 gap-4'>
                {/* start of left column */}
                <div className='col-span-8 space-y-4'>
                    <div className='bg-tt-bg-card rounded-lg p-4'>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-md font-bold text-tt-text-secondary flex items-center">
                                <Zap className="w-4 h-4 mr-1 text-tt-red-400" /> ENGINE
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-tt-text-secondary">KPH</span>
                                <div className={`h-5 w-8 cursor-pointer rounded-full p-1 transition-colors duration-200 ${speedUnit === 'mph' ? 'bg-tt-red-500' : 'bg-tt-blue-500'}`}
                                    onClick={() => setSpeedUnit(speedUnit === 'kph' ? 'mph' : 'kph')}>
                                    <div className={`h-3 w-3 rounded-full bg-white transition-transform duration-200 ${speedUnit === 'mph' ? 'translate-x-3' : 'translate-x-0'}`} />
                                </div>
                                <span className="text-sm text-tt-text-secondary">MPH</span>
                            </div>
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
                        <div className="grid grid-cols-12 mt-6 gap-4">
                            {/* Speed + Gear Telemetry */}
                            <div className="text-center col-span-3">
                                <p className="text-md text-tt-text-secondary">SPEED</p>
                                <p className="text-3xl font-bold">{formattedSpeed.slice(0, formattedSpeed.length - 6)}</p>
                                <p className="text-lg text-tt-text-secondary">{speedUnit.toUpperCase()}</p>
                            </div>
                            <div className="text-center relative col-span-2">
                                <p className="text-md text-tt-text-secondary">GEAR</p>
                                <div className="flex items-center justify-center gap-2">
                                    <p className="text-5xl font-bold">{data.current_gear}</p>
                                    {suggestedGear && suggestedGear !== data.current_gear && (
                                        <div className="bg-tt-red-500 text-white rounded-xl px-3 py-2 shadow-xl border-2 border-tt-red-300">
                                            <span className="text-xl font-bold">{suggestedGear}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Throttle and Brake Horizontal Bars */}
                            <div className="space-y-4 pt-4 col-span-7">
                                <PedalBar value={data.throttle} type="throttle" />
                                <PedalBar value={data.brake} type="brake" />
                            </div>
                        </div>
                    </div>
                    {/* Lap Info and Position */}
                    <div className='bg-tt-bg-card rounded-lg p-4'>

                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-md font-bold text-tt-text-secondary flex items-center">
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
                                            <span className="text-4xl font-bold text-tt-blue-400">{currentPosition}</span>
                                            <span className="text-lg text-tt-text-secondary">/{totalPositions}</span>
                                        </div>
                                    </div>
                                    {/* Divider */}
                                    <div className="h-12 w-px bg-tt-bg-accent opacity-40 mx-4" />
                                    {/* Laps */}
                                    <div className="w-32 flex flex-col items-center">
                                        <p className="text-md text-tt-text-secondary">LAP</p>
                                        <div className="flex items-baseline justify-center">
                                            {currentLap == -1 ? (
                                                <span className="text-4xl font-bold text-tt-red-400">N/A</span>
                                            ) : isTrial ? (
                                                <span className="text-4xl font-bold text-tt-red-400">{currentLap}</span>
                                            ) : (
                                                <>
                                                    <span className="text-4xl font-bold text-tt-red-400">{currentLap}</span>
                                                    <span className="text-lg text-tt-text-secondary">/{totalLaps}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Lap Times */}
                        <div className="grid grid-cols-3 gap-4 mt-3">
                            <div className="text-center">
                                <p className="text-md text-tt-text-secondary">LAST LAP</p>
                                <p className="text-xl font-mono font-bold text-tt-green-400">{formatLapTime(data.last_lap_time)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-md text-tt-text-secondary">CURRENT</p>
                                <p className="text-xl font-mono font-bold text-tt-primary">{formatLapTime(currentLapTime)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-md text-tt-text-secondary">BEST</p>
                                <p className="text-xl text-purple-400 font-mono font-bold ">{formatLapTime(data.best_lap_time)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tire Temperatures and Lap Chart */}
                    <div className="grid grid-cols-2 gap-6">
                        {/* Left side - Tire Temperatures */}
                        <div className="bg-tt-bg-card rounded-lg p-4">
                            <div>
                                <div className="flex items-center mb-2">
                                    <Thermometer className="w-4 h-4 mr-1 text-tt-blue-400" />
                                    <h3 className="text-md font-bold text-tt-text-secondary">TIRE TEMPERATURES</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-2">
                                    <div className="flex justify-center">
                                        <TireTemp position="FRONT LEFT" temp={data.tire_temp_fl} />
                                    </div>
                                    <div className="flex justify-center">
                                        <TireTemp position="FRONT RIGHT" temp={data.tire_temp_fr} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-2">
                                    <div className="flex justify-center">
                                        <TireTemp position="REAR LEFT" temp={data.tire_temp_rl} />
                                    </div>
                                    <div className="flex justify-center">
                                        <TireTemp position="REAR RIGHT" temp={data.tire_temp_rr} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Right side - Lap Time Chart */}
                        <div className="bg-tt-bg-card rounded-lg p-4">
                            {lapHistory.length > 0 ? (
                                <>
                                    <div className="flex items-center mb-5">
                                        <Timer className="w-4 h-4 mr-1 text-tt-blue-400" />
                                        <h3 className="text-md font-bold text-tt-text-secondary">LAP TIMES</h3>
                                    </div>
                                    <div className="h-80">
                                        <ResponsiveContainer width="95%" height="100%">
                                            <LineChart data={lapHistory}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--tt-gray-700)" />
                                                <XAxis
                                                    dataKey="lap"
                                                    stroke="var(--tt-text-gray-400)"
                                                    fontSize={12}
                                                />
                                                <YAxis
                                                    stroke="var(--tt-text-gray-400)"
                                                    fontSize={12}
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'var(--tt-gray-800)',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        fontSize: '12px'
                                                    }}
                                                    formatter={(value: any) => [`${formatLapTime(value*1000)}`, 'Time']}
                                                    labelFormatter={(label) => `Lap ${label}`}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="time"
                                                    stroke="var(--tt-blue-500)"
                                                    strokeWidth={2}
                                                    dot={{ fill: 'var(--tt-blue-500)', r: 3 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-80">
                                    <div className="text-center">
                                        <Timer className="w-8 h-8 mx-auto mb-2 text-tt-text-gray-400" />
                                        <p className="text-sm text-tt-text-gray-400">Complete laps to see lap time chart</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {/* end of left column */}
                {/* start of right column */}
                <div className="col-span-4 space-y-4">
                    <CarInfoDisplay carInfo={data.car_info} type={2} />
                    {/* Fuel Gauge */}
                    <div className="bg-tt-bg-card rounded-lg p-4">
                        <div className="flex items-center mb-2">
                            <Droplet className="w-4 h-4 mr-1 text-tt-red-600" />
                            <h3 className="text-md font-bold text-tt-text-secondary">FUEL STATUS</h3>
                        </div>

                        <div className="flex items-center gap-8">
                            {/* Left side - Stacked info */}
                            <div className="flex flex-col space-y-4 px-4">
                                <div>
                                    <p className="text-md text-tt-text-secondary mb-1">CONSUMPTION</p>
                                    <p className="text-xl font-medium text-tt-text-primary">{averageFuelPerLap > 0 ? `${averageFuelPerLap.toFixed(1)}% / lap` : '---'}</p>
                                </div>
                                <div>
                                    <p className="text-md text-tt-text-secondary mb-1">ESTIMATED</p>
                                    <p className="text-xl font-medium text-tt-text-primary">{estimatedLapsRemaining.toFixed(1)} laps</p>
                                </div>
                            </div>

                            {/* Circular gauge */}
                            <div className="flex ml-20">
                                <CircularGauge
                                    value={fuelPercentage.toFixed(1)}
                                    max={100}
                                    title="REMAINING"
                                    unit="%"
                                    icon={<Droplet className="h-6 w-6 text-tt-red-600" />}
                                    colorClass={"text-tt-red-400"}
                                />
                            </div>
                        </div>
                    </div>
                    {/* Vehicle Vitals */}
                    <div className="bg-tt-bg-card rounded-lg p-4">
                        <div className="flex items-center">
                            <Activity className="w-4 h-4 mr-1 text-tt-blue-400" />
                            <h3 className="text-md font-bold text-tt-text-secondary">VEHICLE VITALS</h3>
                        </div>
                        {/* Oil and Water Bars */}
                        <div className="space-y-3 p-4">
                            <div className="bg-tt-bg-dark rounded-md p-2 flex justify-between items-center">
                                <span className="text-md text-tt-text-secondary w-14">WATER</span>
                                <div className="flex items-center gap-2 flex-1 ml-4">
                                    <div className="flex-1 h-2 bg-tt-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-tt-blue-500 transition-all duration-100"
                                            style={{ width: `${(data.water_temp / 120) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-md font-mono w-12 text-right">{data.water_temp.toFixed(0)}°C</span>
                                </div>
                            </div>
                            <div className="bg-tt-bg-dark rounded-md p-2 flex justify-between items-center">
                                <span className="text-md text-tt-text-secondary w-14">OIL</span>
                                <div className="flex items-center gap-2 flex-1 ml-4">
                                    <div className="flex-1 h-2 bg-tt-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-tt-status-warning transition-all duration-100"
                                            style={{ width: `${(data.oil_temp / 150) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-md font-mono w-12 text-right">{data.oil_temp.toFixed(0)}°C</span>
                                </div>
                            </div>
                        </div>
                        {/* Oil Pressure + Ride Height */}
                        <div className="grid grid-cols-2 gap-2">

                            <div className="bg-tt-bg-dark rounded-md p-2">
                                <p className="text-sm text-tt-text-secondary">OIL PRESSURE</p>
                                <p className="text-lg font-bold text-tt-text-primary">{data.oil_pressure.toFixed(0)} bar</p>
                            </div>

                            <div className="bg-tt-bg-dark rounded-md p-2">
                                <p className="text-sm text-tt-text-secondary">RIDE HEIGHT</p>
                                <p className="text-lg font-bold text-tt-text-primary">{(data.body_height * 1000).toFixed(0)} mm</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default StandardDisplay;