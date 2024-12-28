from pydantic import BaseModel
from typing import List, Optional, AsyncGenerator
from enum import IntFlag
import socket
import struct
from loguru import logger
from salsa20 import Salsa20_xor


class Vector3(BaseModel):
    x: float
    y: float
    z: float


class SimulatorFlags(IntFlag):
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
    packet_id: int
    position: Vector3
    velocity: Vector3
    rotation: Vector3
    rel_orientation_to_north: float
    angular_velocity: Vector3
    body_height: float
    engine_rpm: float
    gas_level: float
    gas_capacity: float
    speed_mps: float
    turbo_boost: float
    oil_pressure: float
    water_temp: float
    oil_temp: float
    tire_temp_fl: float
    tire_temp_fr: float
    tire_temp_rl: float
    tire_temp_rr: float
    current_gear: int
    suggested_gear: int
    flags: SimulatorFlags
    throttle: int
    brake: int
    clutch: float
    clutch_engagement: float
    rpm_after_clutch: float
    transmission_top_speed: float
    gear_ratios: List[float]
    car_code: int


# adapted from gt7telemetry.py
class TelemetryConnection:
    SEND_PORT = 33739
    RECEIVE_PORT = 33740
    BUFFER_SIZE = 4096
    HEARTBEAT_INTERVAL = 100  # packets

    def __init__(self, ps_ip: str):
        self.ps_ip = ps_ip
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.bind(('0.0.0.0', self.RECEIVE_PORT))
        self.socket.settimeout(10)
        self.packet_count = 0

    def _send_heartbeat(self):
        self.socket.sendto(b'A', (self.ps_ip, self.SEND_PORT))

    def _decrypt_packet(self, data: bytes) -> bytes:
        KEY = b'Simulator Interface Packet GT7 ver 0.0'
        # Seed IV is always located here
        IV_START = 0x40
        IV_LENGTH = 0x4

        oiv = data[IV_START:IV_START + IV_LENGTH]
        iv1 = int.from_bytes(oiv, byteorder='little')
        iv2 = iv1 ^ 0xDEADBEAF

        IV = bytearray()
        IV.extend(iv2.to_bytes(4, 'little'))
        IV.extend(iv1.to_bytes(4, 'little'))

        decrypted = Salsa20_xor(data, bytes(IV), KEY[0:32])

        if int.from_bytes(decrypted[0:4], byteorder='little') != 0x47375330:
            return b''
        return decrypted

    async def stream(self) -> AsyncGenerator[TelemetryPacket, None]:
        self._send_heartbeat()

        while True:
            try:
                data, _ = self.socket.recvfrom(self.BUFFER_SIZE)
                self.packet_count += 1

                if self.packet_count > self.HEARTBEAT_INTERVAL:
                    self._send_heartbeat()
                    self.packet_count = 0

                decrypted_data = self._decrypt_packet(data)
                if decrypted_data:
                    yield self._parse_telemetry(decrypted_data)

            except socket.timeout:
                logger.warning("Socket timeout - sending heartbeat")
                self._send_heartbeat()
                self.packet_count = 0
            except Exception as e:
                logger.error(f"Error in telemetry stream: {str(e)}")
                raise

    def _parse_telemetry(self, data: bytes) -> TelemetryPacket:
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
