import { TelemetryPacket } from "@/types/telemetry";

export class WebSocketConnection {
    private ws: WebSocket | null = null;
    private isConnecting = false;

    constructor(
        private onMessage: (data: TelemetryPacket | null) => void,
        private onConnectionChange: (status: boolean) => void
    ) {}

    async connect(psIP: string): Promise<void> {
        // if already connecting, wait
        if (this.isConnecting) {
            return;
        }

        try {
            this.isConnecting = true;
            
            // if there's an existing connection, disconnect first
            if (this.ws) {
                await this.disconnect();
            }

            return new Promise((resolve, reject) => {
                let timeoutId: NodeJS.Timeout;

                const cleanup = () => {
                    if (timeoutId) clearTimeout(timeoutId);
                    if (this.ws) {
                        this.ws.onopen = null;
                        this.ws.onclose = null;
                        this.ws.onerror = null;
                        this.ws.onmessage = null;
                        
                        if (this.ws.readyState === WebSocket.OPEN) {
                            this.ws.close();
                        }
                        this.ws = null;
                    }
                    this.isConnecting = false;
                    this.onConnectionChange(false);
                    this.onMessage(null);
                };

                try {
                    this.ws = new WebSocket(`ws://localhost:8000/ws/telemetry`);

                    // set up connection timeout
                    timeoutId = setTimeout(() => {
                        cleanup();
                        reject(new Error('Connection timeout'));
                    }, 3000);

                    this.ws.onopen = () => {
                        clearTimeout(timeoutId);
                        this.isConnecting = false;
                        this.onConnectionChange(true);
                        this.ws?.send(psIP);
                        resolve();
                    };

                    this.ws.onmessage = (event) => {
                        const data = JSON.parse(event.data);
                        if (data.type === 'heartbeat') return;
                        this.onMessage(data as TelemetryPacket);
                    };

                    this.ws.onclose = () => {
                        cleanup();
                        resolve();
                    };

                    this.ws.onerror = (error) => {
                        cleanup();
                        reject(error);
                    };

                } catch (error) {
                    cleanup();
                    reject(error);
                }
            });
        } catch (error) {
            this.isConnecting = false;
            this.onMessage(null);
            throw error;
        }
    }
    
    async disconnect(): Promise<void> {
        return new Promise<void>((resolve) => {
            const cleanup = () => {
                if (this.ws) {
                    this.ws.onopen = null;
                    this.ws.onclose = null;
                    this.ws.onerror = null;
                    this.ws.onmessage = null;

                    if (this.ws.readyState === WebSocket.OPEN) {
                        this.ws.close();
                    }
                    this.ws = null;
                }
                this.isConnecting = false;
                this.onConnectionChange(false);
                this.onMessage(null);
                resolve();
            };

            if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
                cleanup();
                return;
            }

            this.ws.onclose = () => {
                cleanup();
            };

            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            } else {
                cleanup();
            }

            // fallback, resolve after a short timeout if close event doesn't fire
            setTimeout(cleanup, 100);
        });
    }
}