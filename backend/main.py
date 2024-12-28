from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import uvicorn

# from telemetry.reader import TelemetryReader
from telemetry.reader import TelemetryReader

app = FastAPI(title="GT7 Telemetry Server")

# Configuring CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # may need to adjust later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# configuring the logging
logger.add("logs/gt7_telemetry.log", rotation="500 MB", retention="10 days")


@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        # get PlayStation IP from initial connection message
        data = await websocket.receive_text()
        ps_ip = data.strip()

        # initialize the telemetry connection
        telemetry = TelemetryReader(ps_ip)
        logger.info(f"New telemetry connection established with PlayStation IP: {ps_ip}")

        # start telemetry reading loop
        async for telemetry_data in telemetry.stream():
            await websocket.send_json(telemetry_data)

    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        await websocket.close()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
