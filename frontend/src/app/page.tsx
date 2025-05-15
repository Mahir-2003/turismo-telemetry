'use client'
import React, { useState, useEffect, useCallback } from 'react';
import ConnectionForm from '@/components/telemetry/ConnectionForm';
import TelemetryDisplay from '@/components/telemetry/TelemetryDisplay';
import { WebSocketConnection } from '@/lib/websocket';
import { TelemetryPacket } from '@/types/telemetry';
import { useTheme } from '@/context/ThemeProvider';
import { COLORS } from '@/lib/theme';
import Image from 'next/image';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [telemetryData, setTelemetryData] = useState<TelemetryPacket | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocketConnection | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // get theme context
  const { mode } = useTheme();

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
    <main className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="flex items-center mb-2">
          <Image
            src={mode === 'dark' ? "/TurismoTelemetry-Color-WhiteText.svg" : "/TurismoTelemetry-Color-BlackText.svg"}
            alt="Turismo Telemetry Logo"
            width={200}
            height={80}
          />
        </div>
      </div>
      
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