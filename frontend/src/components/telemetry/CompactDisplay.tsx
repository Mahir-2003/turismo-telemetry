import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TelemetryPacket } from "@/types/telemetry";
import { Gauge, Flag, Fuel, Thermometer, ArrowUp, Zap } from 'lucide-react';
import { formatLapTime, formatSpeed } from '@/lib/utils';
import CarInfoDisplay from './CarInfoDisplay';

interface RacingDashboardProps {
    data: TelemetryPacket | null;
}

interface LapData {
    fuelUsed: number; // Fuel percentage used in each lap
    lapTime: number; // Lap time in milliseconds
}

const RPMBar = ({ rpm, rpmFlashing, rpmHit }: { rpm: number; rpmFlashing: number; rpmHit: number }) => {

    const adjustedRpmHit = rpmHit - (rpmHit * 0.08); // 2% buffer so it can reach the end of the bar
    const percentage = (rpm / adjustedRpmHit) * 100; // percentage of current RPM relative to redline
    const warningThreshold = (rpmFlashing / rpmHit) * 100;     // calculate warning threshold percentage

    // Dynamic color based on RPM percentage (gets red very early, no blue)
    const getColor = (percent: number) => {
        let hue;
        if (percent < 30) {
            // Green to Yellow (120 -> 60)
            hue = 120 - ((percent / 30) * 60);
        } else {
            // Yellow to Red (60 -> 0) - red appears very early
            hue = 60 - ((percent - 30) / 70) * 60;
        }
        return `hsl(${hue}, 90%, 50%)`;
    };
    
    // determine if RPM is in flashing range
    const isFlashing = rpm >= rpmFlashing;

    return (
        <div className='w-full h-4 bg-tt-bg-dark rounded-full overflow-hidden flex'>
            {Array.from({ length: 10 }).map((_, i) => (
                <div
                    key={i}
                    className={`h-full ${i < Math.floor(percentage / 10) ? 
                        (isFlashing && i >= Math.floor(warningThreshold / 10) ? 
                            'animate-[revFlash_0.1s_ease-in-out_infinite]' : '') : 'opacity-0'}`}
                    style={{
                        width: '10%',
                        backgroundColor: getColor(i * 10),
                        borderRight: i < 9 ? '1px solid rgba(0,0,0,0.2)': 'none'
                    }}
                />
            ))}
        </div>
    );
}

// Tire Display Component
const TireDisplay = ({ temp, position }: { temp: number; position: 'fl' | 'fr' | 'rl' | 'rr' }) => {
    // Use the same temperature color logic as StandardDisplay/AdvancedDisplay
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

    const getTextColor = (temp: number): string => {
        if (temp >= 60 && temp < 100) {
            return '#000000'; // dark text for lighter backgrounds
        } else {
            return '#FFFFFF'; // light text for darker backgrounds
        }
    };

    const getTireLabel = () => {
        switch (position) {
            case 'fl': return 'FL';
            case 'fr': return 'FR';
            case 'rl': return 'RL';
            case 'rr': return 'RR';
        }
    };

    return (
        <div className={`relative w-full h-24 rounded-lg overflow-hidden border-2`}
            style={{ 
                backgroundColor: getTemperatureHSL(temp),
                boxShadow: `0 0 20px ${getTemperatureHSL(temp)}66`,
                borderColor: getTemperatureHSL(temp, -10)
            }}
        >
            {/* tire shape */}
            <div className='absolute inset-0 flex flex-col items-center justify-center p-2'>
                <div className='text-xs font-medium' style={{ color: getTextColor(temp) }}>
                    {getTireLabel()}
                </div>
                <div className='text-2xl font-bold' style={{ color: getTextColor(temp) }}>
                    {temp.toFixed(1)}°
                </div>
                <div className="w-16 h-8 border-2 rounded-full mt-1 flex items-center justify-center"
                    style={{ borderColor: getTextColor(temp) }}
                >
                    <div
                        className="w-12 h-4 rounded-full"
                        style={{ backgroundColor: getTextColor(temp), opacity: 0.6 }}
                    />
                </div>
            </div>
        </div>
    );
};

// Throttle/Brake Bar
const PedalBar = ({ value, type }: { value: number; type: 'throttle' | 'brake' }) => {
    const percent = (value / 255) * 100;
    const barColor = type === 'throttle' ? 'bg-tt-blue-500' : 'bg-tt-red-500';

    return (
        <div className='flex items-center gap-2'>
            <span className='text-xs text-tt-text-secondary w-3'>{type === 'throttle' ? 'T' : 'B'}</span>
            <div className='w-full h-3 bg-tt-bg-dark rounded-full overflow-hidden'>
                <div
                    className={`h-full ${barColor}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
            <span className="text-xs w-8 text-tt-text-primary">{percent.toFixed(0)}%</span>
        </div>
    );
};

// Fuel Gauge component
const FuelGauge = ({ percentage, consumption }: { percentage: number; consumption: number }) => {
    return (
        <div className='relative w-full h-6 bg-tt-bg-dark rounded-lg overflow-hidden'>
            <div
                className='h-full bg-gradient-to-r from-tt-red-500 to-tt-blue-400'
                style={{ width: `${percentage}%` }}
            />
            <div className='absolute inset-0 flex items-center justify-end px-2'>
                <span className='text-xs font-medium text-tt-text-primary'>
                    {percentage.toFixed(1)}% | {consumption > 0 ? `${consumption.toFixed(1)}%/lap` : '--'}
                </span>
            </div>
        </div>
    );
};

const CompactDisplay = ({ data }: RacingDashboardProps) => {
    // states for tracking lap data
    const [currentLapTime, setCurrentLapTime] = useState<number>(0);
    const [completedLaps, setCompletedLaps] = useState<LapData[]>([]);
    const [averageFuelPerLap, setAverageFuelPerLap] = useState<number>(0);
    const [averageLapTime, setAverageLapTime] = useState<number>(0);

    const [speedUnit, setSpeedUnit] = useState<'kph' | 'mph'>('kph');
    const prevLapRef = useRef<number>(0);
    const startFuelRef = useRef<number>(100); // store starting fuel percentage
    const lapStartTimeRef = useRef<number>(Date.now());
    const animationFrameRef = useRef<number>(0);
    const accumulatedTimeRef = useRef<number>(0);
    const lastTickRef = useRef<number>(Date.now());
    const wasPausedRef = useRef<boolean>(false)        

    // Fuel monitoring useEffect
    useEffect(() => {
        if (!data) return;

        // check for race reset/restart
        if (data.current_lap === 1 && prevLapRef.current > 1) {
            // reset lap/average data
            setCompletedLaps([]);
            setAverageFuelPerLap(0);
            setAverageLapTime(0);
            startFuelRef.current = data.fuel_percentage;
        }

        // detect lap completion
        if (data.current_lap > 0 && data.current_lap !== prevLapRef.current) {
            const fuelUsedThisLap = startFuelRef.current - data.fuel_percentage;

            // add new lap data
            const newLapData: LapData = {
                fuelUsed: fuelUsedThisLap,
                lapTime: data.last_lap_time
            }

            // update completed laps
            setCompletedLaps(prev => {
                const newLaps = [...prev, newLapData];
                const newLapsLength = newLaps.length > 0 ? newLaps.length - 1 : 0;

                const avgFuel = newLapsLength > 0
                    ? newLaps.reduce((sum, lap) => sum + lap.fuelUsed, 0) / newLapsLength
                    : 0;
                const avgTime = newLapsLength > 0
                    ? newLaps.reduce((sum, lap) => sum + lap.lapTime, 0) / newLapsLength
                    : 0;

                setAverageFuelPerLap(avgFuel);
                setAverageLapTime(avgTime);

                return newLaps;
            });

            // reset starting fuel for next lap
            startFuelRef.current = data.fuel_percentage;
        }
    }, [data?.fuel_percentage, data?.last_lap_time, data?.current_lap]);

    // Lap timing useEffect
    useEffect(() => {
        if (!data) return;

        // handle lap changes
        if (data.current_lap > 0 && data.current_lap !== prevLapRef.current) {
            prevLapRef.current = data.current_lap;
            lapStartTimeRef.current = Date.now();
            accumulatedTimeRef.current = 0;
            lastTickRef.current = Date.now();
            setCurrentLapTime(0);
        }

        // check if the game is paused, in which case do not increment currentLapTime
        const isPaused = Boolean(data.flags & (1 << 1));

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

        // update lap time (ONLY when game is not paused)
        const updateLapTime = () => {
            if (data.current_lap > 0 && !isPaused) {
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
    const hasTurbo = Boolean(data.flags & (1 << 4));


    return (
        <div className='w-full max-w-4xl mx-auto space-y-4'>
            <CarInfoDisplay carInfo={data.car_info} type={1} />

            <div className="bg-tt-bg-card rounded-lg overflow-hidden">
                {/* Top racing lights */}
                <div className="h-4 bg-tt-bg-dark flex">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div
                            key={i}
                            className={`w-1/10 h-full ${data.engine_rpm > (data.rpm_flashing * (0.5 + (i * 0.05))) ?
                                'bg-tt-red-500 animate-pulse' : 'bg-tt-bg-accent'
                                }`}
                        />
                    ))}
                </div>

                {/* Main dashboard content */}
                <div className="p-4 space-y-4">
                    {/* RPM Bar */}
                    <div className="flex items-center gap-2">
                        <RPMBar
                            rpm={data.engine_rpm}
                            rpmFlashing={data.rpm_flashing}
                            rpmHit={data.rpm_hit}
                        />
                        <span className="text-sm font-mono w-20 text-right text-tt-text-primary">
                            {Math.round(data.engine_rpm)}
                        </span>
                    </div>

                    {/* Main racing data */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* Left section */}
                        <div className="col-span-3 space-y-3">
                            <div className="space-y-1">
                                <div className="text-xs text-tt-text-secondary">SPEED</div>
                                <div className="text-4xl font-bold font-mono text-tt-text-primary">
                                    {parseInt(formattedSpeed.split(' ')[0])}
                                </div>
                                <div className="text-xs text-tt-text-secondary">{speedUnit.toUpperCase()}</div>
                            </div>
                            <div onClick={() => setSpeedUnit(speedUnit === 'kph' ? 'mph' : 'kph')}
                                className="text-xs text-tt-text-secondary opacity-50 cursor-pointer hover:opacity-100">
                                Switch to {speedUnit === 'kph' ? 'MPH' : 'KPH'}
                            </div>
                            <div className="space-y-2 pt-4">
                                <PedalBar value={data.throttle} type="throttle" />
                                <PedalBar value={data.brake} type="brake" />
                            </div>
                        </div>

                        {/* Center section */}
                        <div className="col-span-6 flex flex-col items-center justify-center">
                            <div className="relative">
                                <div className="text-8xl font-bold font-mono text-tt-text-primary">
                                    {data.current_gear}
                                </div>
                                {suggestedGear !== null && (
                                    <div className="absolute -top-1 -right-6 bg-tt-red-600 text-white text-sm rounded-full w-6 h-6 flex items-center justify-center">
                                        {suggestedGear}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-6 mt-4 w-full">
                                <div className="text-center">
                                    <div className="text-xs text-tt-text-secondary">LAP</div>
                                    <div className="text-xl font-mono text-tt-text-primary">
                                        {currentLap === -1 ? '--' : isTrial ? currentLap : `${currentLap}/${totalLaps}`}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-tt-text-secondary">TIME</div>
                                    <div className="text-xl font-mono text-tt-text-primary">
                                        {formatLapTime(currentLapTime)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right section */}
                        <div className="col-span-3 space-y-3">
                            <div className="space-y-1">
                                <div className="text-xs text-tt-text-secondary">BEST LAP</div>
                                <div className="text-xl font-mono font-bold text-tt-green-400">
                                    {formatLapTime(data.best_lap_time)}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-tt-text-secondary">LAST LAP</div>
                                <div className="text-xl font-mono font-bold text-tt-text-primary">
                                    {formatLapTime(data.last_lap_time)}
                                </div>
                            </div>
                            <div className="space-y-1 pt-3">
                                <div className="text-xs text-tt-text-secondary">POSITION</div>
                                <div className="text-xl font-mono text-tt-text-primary">
                                    {data.current_position === -1 ?
                                        '--' : `${data.current_position}/${data.total_positions}`}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tire and fuel info */}
                    <div className="grid grid-cols-12 gap-4 mt-4">
                        {/* Tire grid */}
                        <div className="col-span-8 grid grid-cols-2 gap-4">
                            <TireDisplay temp={data.tire_temp_fl} position="fl" />
                            <TireDisplay temp={data.tire_temp_fr} position="fr" />
                            <TireDisplay temp={data.tire_temp_rl} position="rl" />
                            <TireDisplay temp={data.tire_temp_rr} position="rr" />
                        </div>

                        {/* Fuel info */}
                        <div className="col-span-4 flex flex-col justify-between">
                            <div className="space-y-2">
                                <div className="text-xs text-tt-text-secondary flex items-center">
                                    <Fuel className="h-3 w-3 mr-1" />
                                    FUEL
                                </div>
                                <FuelGauge
                                    percentage={data.fuel_percentage}
                                    consumption={averageFuelPerLap}
                                />
                                <div className="text-sm mt-1">
                                    <span className="text-xs text-tt-text-secondary">EST. LAPS: </span>
                                    <span className={`font-mono ${estimatedLapsRemaining < 2 ? 'text-tt-red-400' : 'text-tt-text-primary'}`}>
                                        {estimatedLapsRemaining.toFixed(1)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2 mt-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <div className="text-xs text-tt-text-secondary">OIL TEMP</div>
                                        <div className="text-sm font-mono text-tt-text-primary">
                                            {data.oil_temp.toFixed(1)}°C
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-tt-text-secondary">WATER TEMP</div>
                                        <div className="text-sm font-mono text-tt-text-primary">
                                            {data.water_temp.toFixed(1)}°C
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <div className="text-xs text-tt-text-secondary">OIL PRESS</div>
                                        <div className="text-sm font-mono text-tt-text-primary">
                                            {data.oil_pressure.toFixed(1)} bar
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-tt-text-secondary">TURBO</div>
                                        <div className="text-sm font-mono text-tt-text-primary">
                                            {hasTurbo ? 
                                                `${(data.turbo_boost - 1).toFixed(2)} bar` : '--'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Bottom status bar */}
                <div className="h-3 bg-tt-bg-dark flex">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <div 
                            key={i} 
                            className={`w-1/15 h-full ${
                                i % 2 === 0 ? 'bg-tt-blue-900' : 'bg-tt-bg-accent'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CompactDisplay;