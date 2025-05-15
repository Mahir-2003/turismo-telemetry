interface TyreTempsProps {
    temps: {
        fl: number,
        fr: number,
        rl: number,
        rr: number,
    }
}

const TyreTemperatures = ({ temps }: TyreTempsProps) => {

    // using HSL colors for smoother transitions
    const getTemperatureHSL = (temp: number, adjust: number = 0): string => {
        // HSL values for our temperature range
        // cold (blue-green): 140
        // optimal (green): 120
        // warning (yellow): 60
        // hot (red): 0
        
        let hue: number;
        if (temp < 60) {
            // cold to optimal (140 -> 120)
            hue = 140 - ((temp / 60) * 20);
        } else if (temp < 80) {
            // optimal to warning (120 -> 60)
            hue = 120 - (((temp - 60) / 20) * 60);
        } else if (temp < 100) {
            // warning to hot (60 -> 0)
            hue = 60 - (((temp - 80) / 20) * 60);
        } else {
            hue = 0; // hot
        }

        // Adjust saturation and lightness based on temperature
        const saturation = 85;
        const lightness = 45 + adjust;
        
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    const TyreTemp = ({ temp, position }: {temp: number, position: string}) => (
        <div className="flex flex-col items-center space-y-1">
            <div 
            className="w-24 h-36 rounded-lg relative flex items-center justify-center transition-all duration-500 ease-in-out"
            style={{
                background: `linear-gradient(to bottom,
                    ${getTemperatureHSL(temp, 10)} 0%,
                    ${getTemperatureHSL(temp)} 50%,
                    ${getTemperatureHSL(temp, -10)} 100%
                )`,
                boxShadow: `
                    0 4px 6px -1px ${getTemperatureHSL(temp, -20)}80,
                    0 2px 4px -2px ${getTemperatureHSL(temp)}40,
                    inset 0 2px 4px ${getTemperatureHSL(temp, 15)}40
                `,
                transition: 'all 500ms ease-in-out',
            }}
            >
                <div className="text-tt-text-primary text-2xl font-bold">{temp.toFixed(1)}°</div>
            </div>
            <span className="text-sm font-medium text-tt-text-secondary">{position}</span>
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