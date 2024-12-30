export interface Vector3 {
    x: number;
    y: number;
    z: number;
  }
  
  export enum SimulatorFlags {
    None = 0,
    CarOnTrack = 1 << 0,
    Paused = 1 << 1, // simulation will not be paused in online modes
    LoadingOrProcessing = 1 << 2,
    InGear = 1 << 3,
    HasTurbo = 1 << 4,
    RevLimiterBlinkAlertActive = 1 << 5,
    HandBrakeActive = 1 << 6,
    LightsActive = 1 << 7,
    HighBeamActive = 1 << 8,
    LowBeamActive = 1 << 9,
    ASMActive = 1 << 10,
    TCSActive = 1 << 11,
  }
  
  export interface TelemetryPacket {
    // Position and Movement
    position: Vector3;           // Track position in meters
    velocity: Vector3;           // Velocity in track units (meters)
    rotation: Vector3;          // Rotation (Pitch/Yaw/Roll) from -1 to 1
    relativeOrientationToNorth: number;  // 1.0 is north, 0.0 is south
    angularVelocity: Vector3;   // Car rotation speed in radians/second
    bodyHeight: number;         // Height of car body
  
    // Engine and Performance
    engineRpm: number;          // Current RPM
    gasLevel: number;          // Current gas level in liters, from 0 to gasCapacity
    gasCapacity: number;       // Maximum gas capacity (100 for most cars, 5 for karts, 0 for electric cars)
    speedMps: number;          // Speed in meters per second (m/s)
    turboBoost: number;        // Turbo boost (below 1.0 is below 0 ingame, so 2.0 = 1 x 100kPa)
    oilPressure: number;       // Oil pressure in bars
    waterTemp: number;         // Water temperature
    oilTemp: number;           // Oil temperature
  
    // Tire Data Surface Temperature
    tireTemp: {
      frontLeft: number;      // Temperature in Celsius
      frontRight: number;
      rearLeft: number;
      rearRight: number;
    };
    
    // Tire Additional Data
    wheelRevs: {              // Revolutions per second in radians
      frontLeft: number;
      frontRight: number;
      rearLeft: number;
      rearRight: number;
    };
    
    tireRadius: {             // Tire radius in meters
      frontLeft: number;
      frontRight: number;
      rearLeft: number;
      rearRight: number;
    };
    
    suspensionHeight: {
      frontLeft: number;
      frontRight: number;
      rearLeft: number;
      rearRight: number;
    };
  
    // Race Information
    packetId: number;         // Packet identifier
    lapCount: number;
    lapsInRace: number;       // Laps to finish
    bestLapTime: number;      // In milliseconds
    lastLapTime: number;      // In milliseconds
    timeOfDayProgression: number;  // Current time of day
    preRaceStartPosition: number;
    numCarsAtPreRace: number;
    
    // Car Control
    minAlertRpm: number;
    maxAlertRpm: number;
    calculatedMaxSpeed: number; // Max possible speed achievable with current transmission settings
    flags: SimulatorFlags;
    currentGear: number;
    suggestedGear: number;
    throttle: number;         // 0-255
    brake: number;           // 0-255
  
    // Road Data
    roadPlane: Vector3;
    roadPlaneDistance: number;
  
    // Transmission
    clutchPedal: number;      // 0.0 to 1.0
    clutchEngagement: number; // 0.0 to 1.0
    rpmFromClutchToGearbox: number;
    transmissionTopSpeed: number;
    gearRatios: number[];     // Array of gear ratios
    carCode: number;          // Internal car identifier
  }
  