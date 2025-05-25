import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TelemetryPacket } from "@/types/telemetry";
import { Gauge, Flag, Fuel, Thermometer } from 'lucide-react';
import { formatLapTime, formatSpeed } from '@/lib/utils';
import CarInfoDisplay from './CarInfoDisplay';
import TyreTemperatures from './TyreTemperatures';

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
        <div className='w-full h-2 bg-tt-bg-dark rounded-full overflow-hidden'>
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

const TelemetryDisplay = ({ data, isDevMode = false }: TelemetryDisplayProps) => {
    // states for tracking lap data
    const [currentLapTime, setCurrentLapTime] = useState<number>(0);
    const [completedLaps, setCompletedLaps] = useState<LapData[]>([]);
    const [averageFuelPerLap, setAverageFuelPerLap] = useState<number>(0);
    const [averageLapTime, setAverageLapTime] = useState<number>(0);

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
        <div className='space-y-4'>
            <CarInfoDisplay carInfo={data.car_info} />
            <Card className="w-full max-w-4xl mx-auto mt-4 bg-tt-bg-card border-tt-bg-accent">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between text-tt-text-primary">
                        <div className="flex items-center gap-2">
                            <Gauge className="h-5 w-5 text-tt-blue-400" />
                            Telemetry Dashboard
                            {isDevMode && (
                                <span className="text-xs font-semibold px-2 py-0.5 bg-tt-status-success/20 text-tt-status-success rounded-full">
                                    DEV MODE
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-tt-text-secondary">KPH</span>
                            <div className={`h-5 w-8 cursor-pointer rounded-full p-1 transition-colors duration-200 ${speedUnit === 'mph' ? 'bg-tt-red-500' : 'bg-tt-blue-500'}`}
                                onClick={() => setSpeedUnit(speedUnit === 'kph' ? 'mph' : 'kph')}>
                                <div className={`h-3 w-3 rounded-full bg-white transition-transform duration-200 ${speedUnit === 'mph' ? 'translate-x-3' : 'translate-x-0'}`} />
                            </div>
                            <span className="text-sm text-tt-text-secondary">MPH</span>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-tt-text-secondary">Speed</p>
                            <p className="text-2xl font-bold text-tt-text-primary">{formattedSpeed}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-tt-text-secondary">RPM</p>
                            <p className="text-2xl font-bold text-tt-text-primary">{Math.round(data.engine_rpm)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-tt-text-secondary">Suggested Gear</p>
                            <p className="text-2xl font-bold text-tt-text-primary">{suggestedGear !== null ? suggestedGear : 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-tt-text-secondary">Throttle</p>
                            <p className="text-2xl font-bold text-tt-text-primary">{throttlePercent}%</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-tt-text-secondary">Brake</p>
                            <p className="text-2xl font-bold text-tt-text-primary">{brakePercent}%</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-tt-text-secondary">Gear</p>
                            <p className="text-2xl font-bold text-tt-text-primary">{data.current_gear}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card className="w-full max-w-4xl mx-auto mt-4 bg-tt-bg-card border-tt-bg-accent">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-tt-text-primary">
                        <Flag className="h-5 w-5 text-tt-blue-400" />
                        Lap Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-tt-text-secondary">Position</p>
                            <p className="text-2xl font-bold text-tt-text-primary">{currentPosition == -1 ? 'N/A' : `${currentPosition} / ${totalPositions}`}</p>
                        </div>
                        <div className="space-y-1">  {/* Empty for Spacing */}
                            <p className="text-sm font-medium"></p>
                            <p className="text-2xl font-bold"></p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-tt-text-secondary">Lap</p>
                            <p className="text-2xl font-bold text-tt-text-primary">{currentLap == -1 ?
                                'N/A' :
                                isTrial ? currentLap : `${currentLap} / ${totalLaps}`
                            }
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-tt-text-secondary">Last Lap</p>
                            <p className="text-2xl font-bold text-tt-text-primary">{formatLapTime(data.last_lap_time)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-tt-text-secondary">Current Lap</p>
                            <p className="text-2xl font-bold text-tt-text-primary">{formatLapTime(currentLapTime)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-tt-text-secondary">Best Lap</p>
                            <p className="text-2xl font-bold text-tt-text-primary">{formatLapTime(data.best_lap_time)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card className="w-full max-w-4xl mx-auto mt-4 bg-tt-bg-card border-tt-bg-accent">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-tt-text-primary">
                        <Fuel className="h-5 w-5 text-tt-blue-400" />
                        Fuel Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Fuel Bar */}
                        <div className="relative w-full h-8 bg-tt-bg-dark rounded-md overflow-hidden">
                            {/* Fuel Level Bar */}
                            <div
                                className="absolute h-full bg-gradient-to-r from-tt-red-500 to-tt-blue-400"
                                style={{ width: `${Math.max(0, Math.min(100, fuelPercentage))}%` }}
                            />
                            {/* Percentage Text */}
                            <div className="absolute inset-0 flex items-center justify-end pr-2">
                                <span className="text-white font-bold">
                                    {fuelPercentage.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-tt-text-secondary">Current Fuel</p>
                                <p className="text-2xl font-bold text-tt-text-primary">
                                    {currentFuel.toFixed(1)} / {fuelCapacity.toFixed(1)} L
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-tt-text-secondary">Avg. Fuel Per Lap</p>
                                <p className="text-2xl font-bold text-tt-text-primary">{averageFuelPerLap > 0 ? `${averageFuelPerLap.toFixed(1)}%` : '---'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-tt-text-secondary">Estimated Laps Remaining</p>
                                <p className="text-2xl font-bold text-tt-text-primary">
                                    {estimatedLapsRemaining.toFixed(1)}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card className="w-full max-w-4xl mx-auto mt-4 bg-tt-bg-card border-tt-bg-accent">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-tt-text-primary">
                        <Thermometer className="h-5 w-5 text-tt-blue-400"/>
                        Tyre Temperatures
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <TyreTemperatures
                        temps={{
                            fl: data.tire_temp_fl,
                            fr: data.tire_temp_fr,
                            rl: data.tire_temp_rl,
                            rr: data.tire_temp_rr
                        }}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default TelemetryDisplay;