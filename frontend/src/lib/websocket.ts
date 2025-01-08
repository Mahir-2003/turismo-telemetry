import { TelemetryPacket } from "@/types/telemetry";

export class WebSocketConnection {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 2000;

    constructor(
        private onMessage: (data: TelemetryPacket) => void,
        private onConnectionChange: (status: boolean) => void
    ) {}

    connect(psIP: string) {
        if (this.ws) {
            this.ws.close();
        }

        try {
            this.ws = new WebSocket(`ws://localhost:8000/ws/telemetry`);

            this.ws.onopen = () => {
                this.onConnectionChange(true);
                this.reconnectAttempts = 0;
                // send PlayStation IP as first message
                this.ws?.send(psIP);
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'heartbeat') {
                    return;
                }
                this.onMessage(data as TelemetryPacket);
            };

            this.ws.onclose = () => {
                this.onConnectionChange(false);
                this.handleReconnect(psIP);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.onConnectionChange(false);
            };
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.onConnectionChange(false);
        }
    }

    private handleReconnect(psIP: string) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connect(psIP), this.reconnectDelay);
        }
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.onConnectionChange(false);
    }
    
}