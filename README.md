<p align="center">
  <img src="assets/TurismoTelemetry-Color-whitebg.svg" alt="Logo" width="200">
</p>

# Turismo Telemetry for Gran Turismo 7

A real-time telemetry dashboard for Gran Turismo 7, featuring multiple display modes. Built with Next.js, React, FastAPI, and TypeScript.

## Demonstration Video

Watch a [demonstration video](https://youtu.be/nR9Hvjo_gmk) of Turismo Telemetry in action!

## Screenshots

<img src="docs/images/dashboard1.png" width="400" alt="Dashboard Overview in Time Trial"/><img src="docs/images/dashboard3.png" width="400" alt="Dashboard Overview in Race 1"/><img src="docs/images/dashboard2.png" width="400" alt="Dashboard Overview in Race 2"/>

## Features

### Display Modes
- **Advanced Display** - Comprehensive view with circular gauges, advanced RPM gauge, and detailed charts
- **Standard Display** - Balanced view with RPM bar, circular gauges, and history graphs
- **Compact Display** - Minimal view optimized for mobile and small screens
- **Basic Display** - Original telemetry display with essential metrics

### Real-time Telemetry Data
- **Engine Metrics**: RPM, oil pressure, oil temperature, water temperature
- **Speed**: Current speed (mph/kmh)
- **Tire Data**: Individual tire temperatures and surface temperatures
- **Fuel System**: Fuel level, capacity, per-lap consumption tracking
- **Transmission**: Current gear, suggested gear, RPM after shift
- **Race Information**: Current lap, lap times, race position, total laps
- **Car Information**: Automatic car identification with name, manufacturer, and image

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, TailwindCSS, shadcn/ui, Recharts
- **Backend**: FastAPI (Python), Uvicorn, WebSockets, Salsa20 encryption
- **Communication**: UDP + WebSocket with binary struct parsing

## Prerequisites

- **Node.js** 18.18 or higher
- **Python** 3.10 or higher
- **Gran Turismo 7** on PS4/PS5 *(optional - see [Try Without a PlayStation](#try-without-a-playstation))*
- **Network**: Device on same network as PlayStation

## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Mahir-2003/turismo-telemetry.git
cd turismo-telemetry
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

### 3. Backend Setup
Create and activate a Python virtual environment first (this avoids "externally-managed-environment" errors from `pip`):

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate        # Windows: venv\Scripts\activate
python main.py
```
The backend will start on `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
The frontend will start on `http://localhost:3000`

### 5. Open Dashboard
Navigate to `http://localhost:3000` in your browser.

To confirm the backend is up, open `http://localhost:8000/health` - it should return `{"status":"healthy", ...}`.

> **Note:** The frontend currently connects to the backend at a hardcoded `ws://localhost:8000/ws/telemetry` (see [websocket.ts](frontend/src/lib/websocket.ts)). This means the dashboard must be opened on the same machine that runs the backend (e.g. opening it from your phone won't work yet). Making this configurable is a work in progress.

### Optional: Backend Configuration
The backend runs fine with its defaults. To override them (port, log level, etc.), create a `backend/.env` file, for example:
```
PORT=8000
LOG_LEVEL=DEBUG
```
Note that changing `PORT` also requires updating the hardcoded URL above.

## Try Without a PlayStation

No PS4/PS5 or Gran Turismo 7? You can still try the dashboard with simulated data. **The backend is not needed for this** - only the frontend:

1. Start the frontend (`cd frontend && npm run dev`) and open `http://localhost:3000`.
2. Click the **Dev Mode** toggle (beaker icon, top-right of the page).
3. Click **Connect** (no IP address needed). Mock telemetry will start streaming, and a set of dev controls will appear so you can adjust the simulated values.
4. Use the display mode selector to switch between the Advanced, Standard, Compact and Basic displays.

## Usage

### Connecting to PlayStation

1. **Find Your PlayStation IP Address**:
   - On your PlayStation, go to: **Settings → Network → View Connection Settings**
   - Note the **IPv4 Address** (e.g., 192.168.1.100)

2. **Launch Gran Turismo 7 and start driving**:
   - You must be in an active driving session menu (race, time trial, etc.). GT7 only sends telemetry while a player car is driving - nothing is sent from the start menus or the garage , so the dashboard will stay empty until you've chosen a track and have the 'Start Race' option available.

3. **Connect in Dashboard**:
   - Enter your PlayStation's IP address in the connection form
   - Click **Connect**
   - Telemetry data will begin streaming in real-time. You'll know it's working when the dashboard's values (speed, RPM, gear, etc.) update live as you drive.

> **Note:** The app has so far only been tested with a single dashboard connected to the game at a time.

### Project Structure
```
turismo-telemetry/
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/          
│   │   ├── components/   
│   │   ├── lib/          # utilities
│   │   ├── types/        # type definitions
│   │   └── context/      
│   └── package.json
├── backend/              # Python FastAPI server
│   ├── telemetry/        # core telemetry system
│   │   ├── reader.py     # udp communication
│   │   ├── parser.py     # binary packet parsing
│   │   ├── models.py     # pydantic data models
│   │   ├── fuel_monitor.py
│   │   └── data/         # car database
│   ├── app_config/       
│   ├── tests/            
│   ├── main.py           # FastAPI application entry point
│   └── requirements.txt
├── docs/                 
├── assets/               # Logo and branding
└── README.md
```

## Troubleshooting

### Connection Issues
- Ensure PlayStation and computer are on the same network
- Verify IP address is correct
- Check that Gran Turismo 7 is actively running (in a session)
- Allow the backend through your computer's firewall: the backend receives telemetry on **inbound UDP port 33740** (it sends a keep-alive to the PlayStation on UDP 33739). On macOS and Windows you'll usually get a prompt the first time the backend runs - click **Allow**. If you dismissed it, add an inbound rule for Python (or UDP 33740) in your firewall settings.
- GT7 only sends data while you're driving on track, not in menus

### Backend Not Starting
- Verify Python 3.10+ is installed: `python3 --version`
- Make sure your virtual environment is activated, then install dependencies from the `backend` folder: `pip install -r requirements.txt`
- Check that port 8000 is not in use

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

This project builds upon the work of:
- [Bornhall/gt7telemetry](https://github.com/Bornhall/gt7telemetry) - Original GT7 Python telemetry implementation
- [snipem/gt7dashboard](https://github.com/snipem/gt7dashboard) - GT7 Dashboard inspiration
- [Nenkai/PDTools](https://github.com/Nenkai/PDTools/tree/master) - GT7 Simulator Interface documentation (SimulatorInterface)

---

**Note**: This project is not affiliated with or endorsed by Polyphony Digital or Sony Interactive Entertainment.
