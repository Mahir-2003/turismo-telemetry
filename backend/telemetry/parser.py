# Telemetry Data Parser
import struct
from loguru import logger
from models import TelemetryPacket, Vector3


class TelemetryParser:
    """Parser for GT7 telemetry binary data."""

    def parse(self, data: bytes) -> TelemetryPacket:
        """Parse binary telemetry data into TelemetryPacket model."""
        try:
            return TelemetryPacket(
                # Basic packet info
                packet_id=struct.unpack('i', data[0x70:0x74])[0],

                # Position and movement
                position=Vector3(
                    x=struct.unpack('f', data[0x04:0x08])[0],
                    y=struct.unpack('f', data[0x08:0x0C])[0],
                    z=struct.unpack('f', data[0x0C:0x10])[0]
                ),
                velocity=Vector3(
                    x=struct.unpack('f', data[0x10:0x14])[0],
                    y=struct.unpack('f', data[0x14:0x18])[0],
                    z=struct.unpack('f', data[0x18:0x1C])[0]
                ),
                rotation=Vector3(
                    x=struct.unpack('f', data[0x1C:0x20])[0],  # Pitch
                    y=struct.unpack('f', data[0x20:0x24])[0],  # Yaw
                    z=struct.unpack('f', data[0x24:0x28])[0]  # Roll
                ),
                rel_orientation_to_north=struct.unpack('f', data[0x28:0x2C])[0],
                angular_velocity=Vector3(
                    x=struct.unpack('f', data[0x2C:0x30])[0],
                    y=struct.unpack('f', data[0x30:0x34])[0],
                    z=struct.unpack('f', data[0x34:0x34 + 4])[0]
                ),

                # Body and suspension
                body_height=struct.unpack('f', data[0x38:0x3C])[0],

                # Engine and performance
                engine_rpm=struct.unpack('f', data[0x3C:0x40])[0],
                gas_level=struct.unpack('f', data[0x44:0x48])[0],
                gas_capacity=struct.unpack('f', data[0x48:0x4C])[0],
                speed_mps=struct.unpack('f', data[0x4C:0x50])[0],
                turbo_boost=struct.unpack('f', data[0x50:0x54])[0],
                oil_pressure=struct.unpack('f', data[0x54:0x58])[0],
                water_temp=struct.unpack('f', data[0x58:0x5C])[0],
                oil_temp=struct.unpack('f', data[0x5C:0x60])[0],

                # Tire temperatures
                tire_temp_fl=struct.unpack('f', data[0x60:0x64])[0],
                tire_temp_fr=struct.unpack('f', data[0x64:0x68])[0],
                tire_temp_rl=struct.unpack('f', data[0x68:0x6C])[0],
                tire_temp_rr=struct.unpack('f', data[0x6C:0x70])[0],

                # Transmission and control
                current_gear=struct.unpack('B', data[0x90:0x91])[0] & 0b00001111,
                suggested_gear=struct.unpack('B', data[0x90:0x91])[0] >> 4,
                flags=struct.unpack('H', data[0x8E:0x90])[0],  # Simulator flags
                throttle=struct.unpack('B', data[0x91:0x92])[0],
                brake=struct.unpack('B', data[0x92:0x93])[0],

                # Clutch and transmission
                clutch=struct.unpack('f', data[0xF4:0xF8])[0],
                clutch_engagement=struct.unpack('f', data[0xF8:0xFC])[0],
                rpm_after_clutch=struct.unpack('f', data[0xFC:0x100])[0],
                transmission_top_speed=float(struct.unpack('h', data[0x8C:0x8E])[0]),

                # Gear ratios array
                gear_ratios=[
                    struct.unpack('f', data[0x104:0x108])[0],  # 1st
                    struct.unpack('f', data[0x108:0x10C])[0],  # 2nd
                    struct.unpack('f', data[0x10C:0x110])[0],  # 3rd
                    struct.unpack('f', data[0x110:0x114])[0],  # 4th
                    struct.unpack('f', data[0x114:0x118])[0],  # 5th
                    struct.unpack('f', data[0x118:0x11C])[0],  # 6th
                    struct.unpack('f', data[0x11C:0x120])[0],  # 7th
                    struct.unpack('f', data[0x120:0x124])[0]  # 8th
                ],

                # Car identification
                car_code=struct.unpack('i', data[0x124:0x128])[0]
            )
        except Exception as e:
            logger.error(f"Error parsing telemetry data: {str(e)}")
            raise