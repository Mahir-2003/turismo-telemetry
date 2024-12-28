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
        # #TODO: Implementation of parsing logic here, will be completed once parser is done
        pass
