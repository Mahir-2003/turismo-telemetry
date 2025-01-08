# GT7 UDP Reader
import socket
from typing import AsyncGenerator
from loguru import logger
from salsa20 import Salsa20_xor
import asyncio

from .parser import TelemetryParser
from .models import TelemetryPacket


class TelemetryReader:
    SEND_PORT = 33739
    RECEIVE_PORT = 33740
    BUFFER_SIZE = 4096
    HEARTBEAT_INTERVAL = 100  # packets

    def __init__(self, ps_ip: str):
        """Initialize UDP connection to GT7."""
        self.ps_ip = ps_ip
        self.socket = None
        self.is_running = False
        self.parser = TelemetryParser()

    def initialize_socket(self):
        """Initialize and bind the UDP socket."""
        if self.socket:
            self.close()

        self.socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.socket.bind(('0.0.0.0', self.RECEIVE_PORT))
        self.socket.settimeout(10)
        self.is_running = True

    def _send_heartbeat(self):
        """Send heartbeat packet to GT7."""
        if self.socket and self.is_running:
            try:
                self.socket.sendto(b'A', (self.ps_ip, self.SEND_PORT))
            except Exception as e:
                logger.error(f"Error sending heartbeat: {str(e)}")

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
        self.initialize_socket()
        packet_count = 0

        try:
            self._send_heartbeat()  # Initial heartbeat

            while self.is_running:
                try:
                    data, _ = self.socket.recvfrom(self.BUFFER_SIZE)
                    packet_count += 1

                    if packet_count > self.HEARTBEAT_INTERVAL:
                        self._send_heartbeat()
                        packet_count = 0

                    decrypted_data = self._decrypt_packet(data)
                    if decrypted_data:
                        yield self.parser.parse(decrypted_data)

                    # Allow other tasks to run
                    await asyncio.sleep(0)

                except socket.timeout:
                    logger.warning("Socket timeout - sending heartbeat")
                    self._send_heartbeat()
                    packet_count = 0
                except Exception as e:
                    logger.error(f"Error in telemetry stream: {str(e)}")
                    if not self.is_running:
                        break
                    raise

        finally:
            self.close()

    def close(self):
        """Close the UDP socket and cleanup."""
        self.is_running = False
        if self.socket:
            try:
                self.socket.close()
                self.socket = None
                logger.info("Telemetry socket closed")
            except Exception as e:
                logger.error(f"Error closing socket: {str(e)}")