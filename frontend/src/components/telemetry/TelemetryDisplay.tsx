import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TelemetryPacket } from "@/types/telemetry";
import { Car, Gauge } from 'lucide-react';

interface TelemetryDisplayProps {
    data: TelemetryPacket | null;
}

const TelemetryDisplay = ({ data }: TelemetryDisplayProps) => {
    if (!data) {
        return null;
    }

    const speedKph = (data.speed_mps * 3.6).toFixed(1);
    const throttlePercent = ((data.throttle / 255) * 100).toFixed(1);
    const brakePercent = ((data.brake / 255) * 100).toFixed(1);

    return (
        <Card className="w-full max-w-4xl mx-auto mt-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-5 w-5"/>
                    GT7 Telemetry
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
                        <p className="text-2xl font-bold">{Math.round(data.engineRpm)}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium">Gear</p>
                        <p className="text-2xl font-bold">{data.currentGear}</p>
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
                        <p className="text-sm font-medium">Best Lap</p>
                        <p className="text-2xl font-bold">
                        {data.bestLapTime > 0 ? (data.bestLapTime / 1000).toFixed(3) : '--:--'}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default TelemetryDisplay;