import React from 'react'
import { Card, CardContent } from '@/components/ui/card';
import { CarInfo } from '@/types/telemetry';

interface CarInfoDisplayProps {
    carInfo: CarInfo | null;
}

const CarInfoDisplay = ({ carInfo }: CarInfoDisplayProps) => {
    if (!carInfo) return null;

    return (
        <div className="w-full max-w-4xl mx-auto mb-4">
            <Card className="w-fit">
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
                            <h3 className="text-xl font-bold tracking-tight">
                                {carInfo.maker_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {carInfo.name}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CarInfoDisplay;
