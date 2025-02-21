interface TyreTempsProps {
    temps: {
        fl: number,
        fr: number,
        rl: number,
        rr: number,
    }
}

const TyreTemperatures = ({ temps }: TyreTempsProps) => {
    // temp thresholds for color gradients
    const getTemperatureColor = (temp: number) => {
        if (temp < 60) return 'bg-blue-500'; // cold
        if (temp < 80) return 'bg-green-500'; // optimal
        if (temp < 100) return 'bg-yellow-500'; // warning
        return 'bg-red-500'; // hot
    };

    const getTempGradient = (temp: number) => {
        // dynamic gradient based on temp
        if (temp < 60) return 'from-blue-400 to-blue-600';
        if (temp < 80) return 'from-green-400 to-green-600';
        if (temp < 100) return 'from-yellow-400 to-orange-500';
        return 'from-orange-500 to-red-600';
    };

    const TyreTemp = ({ temp, position }: {temp: number, position: string}) => (
        <div className="flex flex-col items-center space-y-1">
            <div className={`w-24 h-36 rounded-lg bg-gradient-to-b ${getTempGradient(temp)} 
            relative flex items-center justify-center transition-all duration-300`}>
                <div className="text-white text-2xl font-bold">{temp.toFixed(1)}°</div>
            </div>
            <span className="text-sm font-medium">{position}</span>
        </div>
    );

    return (
        <div className="grid grid-cols-1 gap-4 p-8">
            <div className="grid grid-cols-2 gap-4">
                <TyreTemp temp={temps.fl} position="Front Left" />
                <TyreTemp temp={temps.fr} position="Front Right" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <TyreTemp temp={temps.rl} position="Rear Left" />
                <TyreTemp temp={temps.rr} position="Rear Right" />
            </div>
        </div>
    );
};

export default TyreTemperatures;