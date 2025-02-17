from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from enum import IntFlag


class CarInfo(BaseModel):
    """Model representing car and manufacturer information."""
    # configuration tells Pydantic to allow model instances to be serialized properly for JSON transmission
    model_config = ConfigDict(from_attributes=True)

    car_id: int
    name: str
    maker_id: int
    maker_name: str
    image_url: str

class Vector3(BaseModel):
    """3D vector for position, velocity, and rotation data."""
    model_config = ConfigDict(from_attributes=True)

    x: float
    y: float
    z: float


class SimulatorFlags(IntFlag):
    """Flags indicating various simulator states."""
    NONE = 0
    CAR_ON_TRACK = 1 << 0
    PAUSED = 1 << 1
    LOADING = 1 << 2
    IN_GEAR = 1 << 3
    HAS_TURBO = 1 << 4
    REV_LIMITER = 1 << 5
    HANDBRAKE = 1 << 6
    LIGHTS = 1 << 7
    HIGH_BEAM = 1 << 8
    LOW_BEAM = 1 << 9
    ASM_ACTIVE = 1 << 10
    TCS_ACTIVE = 1 << 11


class TelemetryPacket(BaseModel):
    """Model representing a complete telemetry data packet."""
    model_config = ConfigDict(from_attributes=True)

    # Basic packet info
    packet_id: int

    # Position and movement
    position: Vector3
    velocity: Vector3
    rotation: Vector3
    rel_orientation_to_north: float
    angular_velocity: Vector3
    body_height: float

    # Engine and performance
    engine_rpm: float
    gas_level: float
    gas_capacity: float
    speed_mps: float
    turbo_boost: float
    oil_pressure: float
    water_temp: float
    oil_temp: float

    # Tire temperatures
    tire_temp_fl: float
    tire_temp_fr: float
    tire_temp_rl: float
    tire_temp_rr: float

    # Transmission and control
    current_gear: int
    suggested_gear: int
    flags: int                          # SimulatorFlags
    throttle: int                       # 0-255
    brake: int                          # 0-255

    # Clutch and transmission
    clutch: float
    clutch_engagement: float
    rpm_after_clutch: float
    transmission_top_speed: float
    gear_ratios: List[float]

    # Lap and Position Information
    best_lap_time: int
    last_lap_time: int
    current_lap: int                    # current lap time calculated in frontend
    total_laps: int
    current_position: int
    total_positions: int

    # RPM Info
    rpm_flashing: int                   # indicates RPM when rev indicator starts flashing
    rpm_hit: int                        # indicates RPM when rev limiter is hit

    # Fuel Information
    fuel_percentage: float
    fuel_capacity: float                # max fuel capacity
    current_fuel: float
    fuel_consumption_lap: float         # fuel consumed in current lap

    # Car identification
    car_id: int
    car_info: Optional[CarInfo] = None