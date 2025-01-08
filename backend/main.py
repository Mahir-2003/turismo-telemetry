import sys
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import uvicorn
import asyncio
from datetime import datetime
from typing import Dict

from telemetry.reader import TelemetryReader
from app_config.config import settings
from app_config.validators import validate_ps_ip

app = FastAPI(
    title="GT7 Telemetry Server",
    description="Real-time telemetry data server for GT7",
    version="1.0.0"
)

# Configuring CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# configuring the logging
logger.remove()
logger.add(
    settings.LOG_FILE,
    level=settings.LOG_LEVEL,
    rotation="500 MB",
    retention="10 days",
    backtrace=True,
    diagnose=True
)
logger.add(sys.stderr, level=settings.LOG_LEVEL)


# track active connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, dict] = {}

    async def connect(self, client_id: str, websocket: WebSocket, telemetry: TelemetryReader):
        await self.disconnect(client_id)  # ensure cleanup of any existing connection
        self.active_connections[client_id] = {
            'websocket': websocket,
            'telemetry': telemetry,
            'tasks': set()
        }

    async def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            connection = self.active_connections[client_id]

            # cancel all tasks
            tasks = connection.get('tasks', set())
            for task in tasks:
                try:
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
                except Exception as e:
                    logger.error(f"Error cancelling task for {client_id}: {str(e)}")

            # close telemetry
            telemetry = connection.get('telemetry')
            if telemetry:
                telemetry.close()

            # close websocket
            websocket = connection.get('websocket')
            if websocket:
                try:
                    await websocket.close()
                except Exception as e:
                    logger.error(f"Error closing websocket for {client_id}: {str(e)}")

            # remove from active connections
            self.active_connections.pop(client_id)
            logger.info(f"Disconnected client: {client_id}")

    def add_task(self, client_id: str, task: asyncio.Task):
        if client_id in self.active_connections:
            self.active_connections[client_id]['tasks'].add(task)

    def is_connected(self, client_id: str) -> bool:
        return client_id in self.active_connections


manager = ConnectionManager()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "active_connections": len(manager.active_connections)
    }


async def send_websocket_heartbeat(websocket: WebSocket, client_id: str):
    """Send periodic heartbeat to keep WebSocket connection alive"""
    while manager.is_connected(client_id):
        try:
            await websocket.send_json({"type": "heartbeat"})
            await asyncio.sleep(settings.WS_HEARTBEAT_INTERVAL)
        except Exception as e:
            logger.error(f"Heartbeat error for {client_id}: {str(e)}")
            break


@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for telemetry data streaming"""
    client_id = f"{websocket.client.host}:{websocket.client.port}"

    try:
        await websocket.accept()
        logger.info(f"New WebSocket connection attempt from: {client_id}")

        # Get PlayStation IP from initial connection message
        try:
            data = await websocket.receive_text()
            ps_ip = validate_ps_ip(data)
        except ValueError as e:
            await websocket.send_json({"error": str(e)})
            return
        except Exception as e:
            logger.error(f"Error receiving PS IP from {client_id}: {str(e)}")
            return

        # initialize telemetry reader
        telemetry = TelemetryReader(ps_ip)
        await manager.connect(client_id, websocket, telemetry)

        # start heartbeat
        heartbeat_task = asyncio.create_task(
            send_websocket_heartbeat(websocket, client_id)
        )
        manager.add_task(client_id, heartbeat_task)

        logger.info(f"Telemetry connection established for {client_id} with PS IP: {ps_ip}")

        # start telemetry streaming
        try:
            async for telemetry_data in telemetry.stream():
                if not manager.is_connected(client_id):
                    break
                await websocket.send_json(telemetry_data.dict())
        except Exception as e:
            logger.error(f"Error in telemetry stream for {client_id}: {str(e)}")
            raise

    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {str(e)}")
    finally:
        await manager.disconnect(client_id)


@app.on_event("startup")
async def startup_event():
    """Initialize application resources"""
    logger.info("Starting GT7 Telemetry Server")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup application resources"""
    logger.info("Shutting down GT7 Telemetry Server")
    # clean up all active connections
    for client_id in list(manager.active_connections.keys()):
        await manager.disconnect(client_id)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )