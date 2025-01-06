import React from 'react'
import { Card, CardContent } from '@/components/ui/card';
import { CarInfo } from '@/types/telemetry';

interface CarInfoDisplayProps {
    carInfo: CarInfo | null;
}

const CarInfoDisplay = ({ carInfo }: CarInfoDisplayProps) => {
    if (!carInfo) return null;

    return (
        <Card className='w-full max-w-4xl mx-auto mb-4'>
            <CardContent className='pt-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6 items-center'>
                    {/* Car Image */}
                    <div className="relative h-48 rounded-lg overflow-hidden bg-secondary order-2 md:order-1">
                        <img 
                            src={carInfo.image_url} 
                            alt={`${carInfo.maker_id} ${carInfo.name}`} 
                            className='object-contain w-full h-full'
                            onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                img.src = "/api/placeholder/400/320";
                            }}
                        />
                    </div>
                    <div className='space-y-2 order-1 md:order-2'>
                        <h3 className="text-2xl font-bold tracking-tight">
                            {carInfo.maker_name}
                        </h3>
                        <p className='text-lg text-muted-foreground'>
                            {carInfo.name}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default CarInfoDisplay;
