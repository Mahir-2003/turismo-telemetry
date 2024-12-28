from pydantic import BaseModel
from typing import List
from enum import IntFlag


class Vector3(BaseModel):
    """3D vector for position, velocity, and rotation data."""
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
    flags: int  # SimulatorFlags
    throttle: int  # 0-255
    brake: int  # 0-255

    # Clutch and transmission
    clutch: float
    clutch_engagement: float
    rpm_after_clutch: float
    transmission_top_speed: float
    gear_ratios: List[float]

    # Car identification
    car_code: int