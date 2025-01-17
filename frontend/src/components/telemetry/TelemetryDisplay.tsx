import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TelemetryPacket } from "@/types/telemetry";
import { Gauge, Flag } from 'lucide-react';
import { formatLapTime } from '@/lib/utils';
import CarInfoDisplay from './CarInfoDisplay';

interface TelemetryDisplayProps {
    data: TelemetryPacket | null;
}

const TelemetryDisplay = ({ data }: TelemetryDisplayProps) => {
    const [currentLapTime, setCurrentLapTime] = useState<number>(0);
    const prevLapRef = useRef<number>(0);
    const lapStartTimeRef = useRef<number>(Date.now());
    const animationFrameRef = useRef<number>();
    const accumulatedTimeRef = useRef<number>(0);
    const lastTickRef = useRef<number>(Date.now());
    const wasPausedRef = useRef<boolean>(false);

    useEffect(() => {
        if(!data) return;

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

    const speedKph = (data.speed_mps * 3.6).toFixed(1);
    const throttlePercent = ((data.throttle / 255) * 100).toFixed(1);
    const brakePercent = ((data.brake / 255) * 100).toFixed(1);
    const suggestedGear = data.suggested_gear !== 15 ? data.suggested_gear : null; // 15 == no suggested gear
    const currentLap = data.current_lap;
    const totalLaps = data.total_laps;
    const currentPosition = data.current_position;
    const totalPositions = data.total_positions;
    const isTrial = totalLaps == 0; // if total laps is 0 it is a time/drift trial

    return (
        <div className='space-y-4'>
            <CarInfoDisplay carInfo={data.car_info} />

            <Card className="w-full max-w-4xl mx-auto mt-4">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gauge className="h-5 w-5"/>
                        Telemetry Dashboard
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Speed</p>
                            <p className="text-2xl font-bold">{speedKph} km/h</p>
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
                            <Flag className="h-5 w-5"/>
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
        </div>
    );
};

export default TelemetryDisplay;