import React from 'react'
import { Card, CardContent } from '@/components/ui/card';
import { CarInfo } from '@/types/telemetry';
import { COLORS } from '@/lib/theme';

interface CarInfoDisplayProps {
    carInfo: CarInfo | null;
    type?: 1 | 2; // Type 1 for TelemetryDisplay, Type 2 for StandardDisplay
}

const CarInfoDisplay = ({ carInfo, type = 1 }: CarInfoDisplayProps) => {
    if (!carInfo) return null;

    // Type 1 - Original horizontal layout for TelemetryDisplay
    if (type === 1) {
        return (
            <div className="w-full max-w-4xl mx-auto mb-4">
                <Card className="w-fit bg-tt-bg-card border-tt-bg-accent">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                            {/* Car Image */}
                            <div className="relative w-40 h-24 overflow-hidden bg-black rounded-lg">
                                <img
                                    src={carInfo.image_url}
                                    alt={`${carInfo.maker_name} ${carInfo.name}`}
                                    className="object-contain w-full h-full"
                                    onError={(e) => {
                                        const img = e.target as HTMLImageElement;
                                        img.src = "/api/placeholder/400/320";
                                    }}
                                />
                            </div>
                            
                            {/* Car Information */}
                            <div className="pr-6">
                                <h3 className="text-xl font-bold tracking-tight text-tt-text-primary">
                                    {carInfo.maker_name}
                                </h3>
                                <p className="text-sm text-tt-text-secondary">
                                    {carInfo.name}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    // Type 2 - Vertical layout for StandardDisplay
    return (
        <div className="bg-tt-bg-card rounded-lg p-4 flex flex-col items-center">
            <img
                src={carInfo.image_url}
                alt={`${carInfo.maker_name} ${carInfo.name}`}
                className="w-full h-auto mb-2 rounded"
                onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = "/api/placeholder/400/320";
                }}
            />
            <div className="text-center">
                <h3 className="text-xl font-bold tracking-tight text-tt-text-primary">
                    {carInfo.maker_name}
                </h3>
                <p className="text-md text-tt-text-secondary">
                    {carInfo.name}
                </p>
            </div>
        </div>
    );
};

export default CarInfoDisplay;
