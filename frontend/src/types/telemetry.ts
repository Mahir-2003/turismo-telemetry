export interface CarInfo {
  car_id: number;
  name: string;
  maker_id: number;
  maker_name: string;
  image_url: string;
}

export interface Vector3 {
    x: number;
    y: number;
    z: number;
  }
  
export enum SimulatorFlags {
  NONE = 0,
  CAR_ON_TRACK = 1 << 0,
  PAUSED = 1 << 1,                // simulation will not be paused in online modes
  LOADING = 1 << 2,
  IN_GEAR = 1 << 3,
  HAS_TURBO = 1 << 4,
  REV_LIMITER = 1 << 5,
  HANDBRAKE = 1 << 6,
  LIGHTS = 1 << 7,
  HIGH_BEAM = 1 << 8,
  LOW_BEAM = 1 << 9,
  ASM_ACTIVE = 1 << 10,
  TCS_ACTIVE = 1 << 11,
}

export interface TelemetryPacket {
  // Position and Movement
  position: Vector3;              // Track position in meters
  velocity: Vector3;              // Velocity in track units (meters)
  rotation: Vector3;              // Rotation (Pitch/Yaw/Roll) from -1 to 1
  rel_orientation_to_north: number;  // 1.0 is north, 0.0 is south
  angular_velocity: Vector3;      // Car rotation speed in radians/second
  body_height: number;            // Height of car body

  // Engine and Performance
  engine_rpm: number;             // Current RPM
  gas_level: number;              // Current gas level in liters, from 0 to gasCapacity
  gas_capacity: number;           // Maximum gas capacity (100 for most cars, 5 for karts, 0 for electric cars)
  speed_mps: number;              // Speed in meters per second (m/s)
  turbo_boost: number;            // Turbo boost (below 1.0 is below 0 ingame, so 2.0 = 1 x 100kPa)
  oil_pressure: number;           // Oil pressure in bars
  water_temp: number;             // Water temperature
  oil_temp: number;               // Oil temperature

  // Tire Data Surface Temperature
  // Temperature in Celsius
  tire_temp_fl: number
  tire_temp_fr: number
  tire_temp_rl: number
  tire_temp_rr: number

  /* Not yet implemented in models.py, update models.py to use
  this data, and check https://github.com/Nenkai/PDTools/blob/master/PDTools.SimulatorInterface/SimulatorPacket.cs
  to see what's available
    */
  // // Tire Additional Data
  // // Revolutions per second in radians
  // wheelRevs: {
  //   frontLeft: number;
  //   frontRight: number;
  //   rearLeft: number;
  //   rearRight: number;
  // };
  //
  // tireRadius: {                  // Tire radius in meters
  //   frontLeft: number;
  //   frontRight: number;
  //   rearLeft: number;
  //   rearRight: number;
  // };
  //
  // suspensionHeight: {
  //   frontLeft: number;
  //   frontRight: number;
  //   rearLeft: number;
  //   rearRight: number;
  // };
  //
  // Race Information
  packet_id: number;                // Packet identifier
  time_of_day: number;              // Current time of day
  preRaceStartPosition: number;
  numCarsAtPreRace: number;
  
  // Car Control
  min_alert_rpm: number;
  max_alert_rpm: number;
  calculate_max_speed: number;       // Max possible speed achievable with current transmission settings
  flags: SimulatorFlags;
  current_gear: number;
  suggested_gear: number;
  throttle: number;                  // 0-255
  brake: number;                     // 0-255

  // Road Data
  roadPlane: Vector3;
  roadPlaneDistance: number;

  // Transmission
  clutch_pedal: number;               // 0.0 to 1.0
  clutch_engagement: number;          // 0.0 to 1.0
  rpm_after_clutch: number;
  transmission_top_speed: number;
  gear_ratios: number[];              // Array of gear ratios

  // Lap and Position Information
  best_lap_time: number;              // In milliseconds
  last_lap_time: number;              // In milliseconds
  current_lap: number;
  total_laps: number;
  current_position: number;
  total_positions: number;

  // Fuel Information
  fuel_percentage: number;
  fuel_capacity: number;              // max fuel capacity
  current_fuel: number;
  fuel_consuption_lap: number;        // fuel consumed in current lap

  // RPM Info
  rpm_flashing: number;               // indicates RPM when rev indicator starts flashing
  rpm_hit: number;                    // indicates RPM when rev limiter is hit

  // Car Code
  car_id: number;                     // Internal car identifier
  car_info: CarInfo;                  // Car information based on CarInfo interface
}
