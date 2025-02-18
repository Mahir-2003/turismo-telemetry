'use client'
import React, { useState, useEffect, useCallback } from 'react';
import ConnectionForm from '@/components/telemetry/ConnectionForm';
import TelemetryDisplay from '@/components/telemetry/TelemetryDisplay';
import RacingDisplay from '@/components/telemetry/RacingDisplay';
import { WebSocketConnection } from '@/lib/websocket';
import { TelemetryPacket } from '@/types/telemetry';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [telemetryData, setTelemetryData] = useState<TelemetryPacket | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocketConnection | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // clean up on unmount
    return () => {
      if (wsConnection) {
        wsConnection.disconnect();
        setTelemetryData(null);
      }
    };
  }, [wsConnection]);

  const handleConnect = useCallback(async (psIP: string) => {
    try {
      setIsLoading(true);
      setTelemetryData(null);

      // if there's an existing connection, disconnect it first
      if (wsConnection) {
        await wsConnection.disconnect();
      }

      // create new connection
      const connection = new WebSocketConnection(
        (data) => setTelemetryData(data),
        (status) => setIsConnected(status)
      );

      // store the connection instance
      setWsConnection(connection);

      // attempt to connect
      await connection.connect(psIP);
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnected(false);
      setTelemetryData(null);
    } finally {
      setIsLoading(false);
    }
  }, [wsConnection]);

  const handleDisconnect = useCallback(async () => {
    setIsLoading(true);
    try {
      if (wsConnection) {
        await wsConnection.disconnect();
        setWsConnection(null);
        setTelemetryData(null);
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [wsConnection]);

  return (
    <main className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-center mb-8">
        Turismo Telemetry
      </h1>
      
      <ConnectionForm 
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        isConnected={isConnected}
        isLoading={isLoading}
      />
      
      <TelemetryDisplay data={telemetryData} />
    </main>
  );
}