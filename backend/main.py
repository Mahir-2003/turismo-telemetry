import sys
from fastapi import FastAPI, Path, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import uvicorn
import asyncio
from datetime import datetime

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
    allow_origins=["*"],  # may need to adjust later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# configuring the logging
logger.remove()  # remove default handler
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
active_connections: dict[str, WebSocket] = {}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "active_connections": len(active_connections)
    }


@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for telemetry data streaming"""
    await websocket.accept()
    client_id = f"{websocket.client.host}:{websocket.client.port}"

    try:
        # get PlayStation IP from initial connection message
        data = await websocket.receive_text()
        try:
            ps_ip = validate_ps_ip(data)
        except ValueError as e:
            await websocket.send_json({"error": str(e)})
            await websocket.close()
            return

        # store active connection
        active_connections[client_id] = websocket
        logger.info(f"New telemetry connection established with PS IP: {ps_ip}")

        # initialize the telemetry connection
        telemetry = TelemetryReader(ps_ip)

        # start heartbeat task
        heartbeat_task = asyncio.create_task(
            send_websocket_heartbeat(websocket, client_id)
        )

        # start telemetry reading loop
        try:
            async for telemetry_data in telemetry.stream():
                await websocket.send_json(telemetry_data.dict())
        except Exception as e:
            logger.error(f"Error in telemetry stream: {str(e)}")
            raise
        finally:
            heartbeat_task.cancel()

    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        active_connections.pop(client_id, None)
        await websocket.close()


async def send_websocket_heartbeat(websocket: WebSocket, client_id: str):
    """Send periodic heartbeat to keep WebSocket connection alive"""
    while True:
        try:
            if client_id not in active_connections:
                break
            await websocket.send_json({"type": "heartbeat"})
            await asyncio.sleep(settings.WS_HEARTBEAT_INTERVAL)
        except Exception as e:
            logger.error(f"Heartbeat error: {str(e)}")


@app.on_event("startup")
async def startup_event():
    """Initialize application resources"""
    logger.info("Starting GT7 Telemetry Server")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup application resources"""
    logger.info("Shutting down GT7 Telemetry Server")
    for client_id, websocket in active_connections.items():
        try:
            await websocket.close()
        except Exception as e:
            logger.error(f"Error closing connection {client_id}: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
