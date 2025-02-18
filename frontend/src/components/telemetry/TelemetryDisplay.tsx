import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TelemetryPacket } from "@/types/telemetry";
import { Gauge, Flag, Fuel, Thermometer } from 'lucide-react';
import { formatLapTime, formatSpeed } from '@/lib/utils';
import CarInfoDisplay from './CarInfoDisplay';

interface TelemetryDisplayProps {
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

    // smooth gradient that transitions through the colors, UNUSED, KEPT FOR NOW
    // const gradient = `linear-gradient(to right, 
    //     hsl(142, 76%, 36%) 0%, 
    //     hsl(40, 96%, 45%) ${warningThreshold}%, 
    //     hsl(0, 84%, 60%) ${warningThreshold + 20}%, 
    //     hsl(0, 84%, 60%) 100%)`;


    // color based on RPM percentage
    const getColor = (percent: number) => {
        // start with green hue (120), transition to yellow (60), then red (0)
        const hue = Math.max(0, 120 - (percent * 1.1)); // multipler to make red appear sooner
        return `hsl(${hue}, 90%, 50%)`;
    };
    // determine if RPM is in flashing range
    const isFlashing = rpm >= rpmFlashing;

    return (
        <div className='w-full h-2 bg-gray-800 rounded-full overflow-hidden'>
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

const TelemetryDisplay = ({ data }: TelemetryDisplayProps) => {
    // states for tracking lap data
    const [currentLapTime, setCurrentLapTime] = useState<number>(0);
    const [completedLaps, setCompletedLaps] = useState<LapData[]>([]);
    const [averageFuelPerLap, setAverageFuelPerLap] = useState<number>(0);
    const [averageLapTime, setAverageLapTime] = useState<number>(0);

    const [speedUnit, setSpeedUnit] = useState<'kph' | 'mph'>('kph');
    const prevLapRef = useRef<number>(0);
    const startFuelRef = useRef<number>(100); // store starting fuel percentage
    const lapStartTimeRef = useRef<number>(Date.now());
    const animationFrameRef = useRef<number>();
    const accumulatedTimeRef = useRef<number>(0);
    const lastTickRef = useRef<number>(Date.now());
    const wasPausedRef = useRef<boolean>(false);

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

    return (
        <div className='space-y-4'>
            <CarInfoDisplay carInfo={data.car_info} />

            <Card className="w-full max-w-4xl mx-auto mt-4">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Gauge className="h-5 w-5" />
                            Telemetry Dashboard
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm">KPH</span>
                            <div className={`h-5 w-8 cursor-pointer rounded-full p-1 transition-colors duration-200 ${speedUnit === 'mph' ? 'bg-red-500' : 'bg-blue-500'}`}
                                onClick={() => setSpeedUnit(speedUnit === 'kph' ? 'mph' : 'kph')}>
                                <div className={`h-3 w-3 rounded-full bg-white transition-transform duration-200 ${speedUnit === 'mph' ? 'translate-x-3' : 'translate-x-0'}`} />
                            </div>
                            <span className="text-sm">MPH</span>
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
                        <span className="text-sm font-bold min-w-[80px] text-right">
                            {Math.round(data.engine_rpm)} RPM
                        </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Speed</p>
                            <p className="text-2xl font-bold">{formattedSpeed}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">RPM</p>
                            <p className="text-2xl font-bold">{Math.round(data.engine_rpm)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Suggested Gear</p>
                            <p className="text-2xl font-bold">{suggestedGear !== null ? suggestedGear : 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Throttle</p>
                            <p className="text-2xl font-bold">{throttlePercent}%</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Brake</p>
                            <p className="text-2xl font-bold">{brakePercent}%</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Gear</p>
                            <p className="text-2xl font-bold">{data.current_gear}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card className="w-full max-w-4xl mx-auto mt-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Flag className="h-5 w-5" />
                        Lap Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Position</p>
                            <p className="text-2xl font-bold">{currentPosition == -1 ? 'N/A' : `${currentPosition} / ${totalPositions}`}</p>
                        </div>
                        <div className="space-y-1">  {/* Empty for Spacing */}
                            <p className="text-sm font-medium"></p>
                            <p className="text-2xl font-bold"></p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Lap</p>
                            <p className="text-2xl font-bold">{currentLap == -1 ?
                                'N/A' :
                                isTrial ? currentLap : `${currentLap} / ${totalLaps}`
                            }
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Last Lap</p>
                            <p className="text-2xl font-bold">{formatLapTime(data.last_lap_time)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Current Lap</p>
                            <p className="text-2xl font-bold">{formatLapTime(currentLapTime)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Best Lap</p>
                            <p className="text-2xl font-bold">{formatLapTime(data.best_lap_time)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card className="w-full max-w-4xl mx-auto mt-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Fuel className="h-5 w-5" />
                        Fuel Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Fuel Bar */}
                        <div className="relative w-full h-8 bg-gray-800 rounded-md overflow-hidden">
                            {/* Fuel Level Bar */}
                            <div
                                className="absolute h-full bg-orange-400 transition-all duration-300 ease-in-out"
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
                                <p className="text-sm font-medium">Current Fuel</p>
                                <p className="text-2xl font-bold">
                                    {currentFuel.toFixed(1)} / {fuelCapacity.toFixed(1)} L
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Avg. Fuel Per Lap</p>
                                <p className="text-2xl font-bold">{averageFuelPerLap > 0 ? `${averageFuelPerLap.toFixed(1)}%` : '---'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Estimated Laps Remaining</p>
                                <p className="text-2xl font-bold">
                                    {estimatedLapsRemaining.toFixed(1)}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TelemetryDisplay;