'use client'
import React, { useState, useEffect } from 'react';
import ConnectionForm from '@/components/telemetry/ConnectionForm';
import TelemetryDisplay from '@/components/telemetry/TelemetryDisplay';
import { WebSocketConnection } from '@/lib/websocket';
import { TelemetryPacket } from '@/types/telemetry';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [telemetryData, setTelemetryData] = useState<TelemetryPacket | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocketConnection | null>(null);

  useEffect(() => {
    // Cleanup WebSocket connection on unmount
    return () => {
      if (wsConnection) {
        wsConnection.disconnect();
      }
    };
  }, [wsConnection]);

  const handleConnect = (psIP: string) => {
    const connection = new WebSocketConnection(
      (data) => setTelemetryData(data),
      (status) => setIsConnected(status)
    );
    console.log(telemetryData);
    connection.connect(psIP);
    setWsConnection(connection);
  };

  return (
    <main className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-center mb-8">
        Turismo Telemetry
      </h1>
      
      <ConnectionForm 
        onConnect={handleConnect}
        isConnected={isConnected}
      />
      
      <TelemetryDisplay data={telemetryData} />
    </main>
  );
}