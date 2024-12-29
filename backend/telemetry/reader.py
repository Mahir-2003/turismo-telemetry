# GT7 UDP Reader

import socket
from typing import AsyncGenerator
from loguru import logger
from salsa20 import Salsa20_xor

from backend.telemetry.parser import TelemetryParser
from backend.telemetry.models import TelemetryPacket


class TelemetryReader:
    SEND_PORT = 33739
    RECEIVE_PORT = 33740
    BUFFER_SIZE = 4096
    HEARTBEAT_INTERVAL = 100  # packets

    def __init__(self, ps_ip: str):
        """Initialize UDP connection to GT7."""
        self.ps_ip = ps_ip
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.bind(('0.0.0.0', self.RECEIVE_PORT))
        self.socket.settimeout(10)
        self.packet_count = 0
        self.parser = TelemetryParser()

    def _send_heartbeat(self):
        """Send heartbeat packet to GT7."""
        self.socket.sendto(b'A', (self.ps_ip, self.SEND_PORT))

    def _decrypt_packet(self, data: bytes) -> bytes:
        """Decrypt received telemetry data using Salsa20."""
        KEY = b'Simulator Interface Packet GT7 ver 0.0'
        IV_START = 0x40
        IV_LENGTH = 0x4

        oiv = data[IV_START:IV_START + IV_LENGTH]
        iv1 = int.from_bytes(oiv, byteorder='little')
        iv2 = iv1 ^ 0xDEADBEAF

        IV = bytearray()
        IV.extend(iv2.to_bytes(4, 'little'))
        IV.extend(iv1.to_bytes(4, 'little'))

        decrypted = Salsa20_xor(data, bytes(IV), KEY[0:32])

        # Verify magic number
        if int.from_bytes(decrypted[0:4], byteorder='little') != 0x47375330:
            return b''
        return decrypted

    async def stream(self) -> AsyncGenerator[TelemetryPacket, None]:
        """Stream telemetry data from GT7."""
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
                    yield self.parser.parse(decrypted_data)

            except socket.timeout:
                logger.warning("Socket timeout - sending heartbeat")
                self._send_heartbeat()
                self.packet_count = 0
            except Exception as e:
                logger.error(f"Error in telemetry stream: {str(e)}")
                raise