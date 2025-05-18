'use client'
import React, { useState, useEffect, useCallback } from 'react';
import ConnectionForm from '@/components/telemetry/ConnectionForm';
import TelemetryDisplay from '@/components/telemetry/TelemetryDisplay';
import StandardDisplay from '@/components/telemetry/StandardDisplay';
import RacingDisplay from '@/components/telemetry/RacingDisplay';
import { WebSocketConnection } from '@/lib/websocket';
import { TelemetryPacket } from '@/types/telemetry';
import { useTheme } from '@/context/ThemeProvider';
import { COLORS } from '@/lib/theme';
import Image from 'next/image';
import DevModeToggle from '@/components/dev/DevModeToggle';
import DevControls from '@/components/dev/DevControls';
import mockTelemetryGenerator from '@/lib/mockTelemetry';

export default function Home() {
  const [isConnected, setIsConnected] = useState(false);
  const [telemetryData, setTelemetryData] = useState<TelemetryPacket | null>(null);
  const [wsConnection, setWsConnection] = useState<WebSocketConnection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [mockDataActive, setMockDataActive] = useState(false);

  // get theme context
  const { mode } = useTheme();

  useEffect(() => {
    // clean up on unmount
    return () => {
      if (wsConnection) {
        wsConnection.disconnect();
        setTelemetryData(null);
      }
      // Clean up mock data generator
      mockTelemetryGenerator.stop();
    };
  }, [wsConnection]);
  
  // Initialize dev mode from localStorage
  useEffect(() => {
    const savedDevMode = localStorage.getItem('turismoTelemetryDevMode');
    if (savedDevMode === 'true') {
      setIsDevMode(true);
    }
  }, []);
  
  // Handle dev mode toggle
  useEffect(() => {
    if (isDevMode) {
      // Start mock data generator and subscribe to updates
      mockTelemetryGenerator.start();
      setMockDataActive(true);
      
      // If real connection exists, disconnect it
      if (wsConnection) {
        wsConnection.disconnect();
        setWsConnection(null);
      }
    } else {
      // Stop mock data generator
      mockTelemetryGenerator.stop();
      setMockDataActive(false);
      
      // Clear any existing mock data if dev mode is disabled
      if (!isConnected) {
        setTelemetryData(null);
      }
    }
    
    return () => {
      if (!isDevMode) {
        // Cleanup mock data subscription when dev mode is disabled
        mockTelemetryGenerator.stop();
      }
    };
  }, [isDevMode, wsConnection, isConnected]);
  
  // Subscribe to mock telemetry data
  useEffect(() => {
    if (isDevMode) {
      const unsubscribe = mockTelemetryGenerator.subscribe((mockData) => {
        setTelemetryData(mockData);
      });
      
      return unsubscribe;
    }
  }, [isDevMode]);

  const handleConnect = useCallback(async (psIP: string) => {
    // If in dev mode, don't try to connect to a real PS5
    if (isDevMode) {
      setIsConnected(true);
      setMockDataActive(true);
      return;
    }
    
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
  }, [wsConnection, isDevMode]);

  const handleDisconnect = useCallback(async () => {
    setIsLoading(true);
    
    // Handle mock data disconnection
    if (isDevMode) {
      setIsConnected(false);
      setTelemetryData(null);
      setMockDataActive(false);
      setIsLoading(false);
      return;
    }
    
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
  }, [wsConnection, isDevMode]);

return (
    // <main className="container mx-auto p-4 space-y-6">
    <main className="w-full p-4 space-y-6">
    <div className="container mx-auto"></div>
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
      
      <DevModeToggle 
        isDevMode={isDevMode}
        onToggle={setIsDevMode}
      />
      
      <DevControls isVisible={isDevMode && mockDataActive} />
      
      <ConnectionForm 
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        isConnected={isConnected}
        isLoading={isLoading}
        isDevMode={isDevMode}
      />
      
      <TelemetryDisplay data={telemetryData} isDevMode={isDevMode} />
      {/* <StandardDisplay data={telemetryData} isDevMode={isDevMode} /> */}
      {/* <RacingDisplay data={telemetryData}/> */}
    </main>
  );
}