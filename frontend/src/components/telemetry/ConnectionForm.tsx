import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { COLORS } from '@/lib/theme';

interface ConnectionFormProps {
    onConnect: (ip: string) => void;
    onDisconnect: () => void;
    isConnected: boolean;
    isLoading: boolean;
}

const ConnectionForm = ({ 
    onConnect, 
    onDisconnect, 
    isConnected,
    isLoading 
}: ConnectionFormProps) => {
    const [ip, setIp] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isConnected) {
            await onDisconnect();
        } else {
            await onConnect(ip);
        }
    };

    return (
        <Card className='w-full max-w-md mx-auto bg-tt-bg-card border-tt-bg-accent'>
            <CardHeader>
                <CardTitle className='flex items-center gap-2 text-tt-text-primary'>
                    {isLoading ? (
                        <Loader2 className='h-5 w-5 animate-spin'/>
                    ) : isConnected ? (
                        <Wifi className='h-5 w-5 text-tt-status-success'/>
                    ) : (
                        <WifiOff className='h-5 w-5 text-tt-status-error' />
                    )}
                    PlayStation Connection
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                        <Input 
                            type='text'
                            placeholder='PlayStation IP Address'
                            value={ip}
                            onChange={(e) => setIp(e.target.value)}
                            pattern="^(\d{1,3}\.){3}\d{1,3}$"
                            required
                            className='w-full bg-tt-bg-dark border-tt-bg-accent text-tt-text-primary'
                            disabled={isConnected || isLoading}
                        />
                    </div>
                    <Button 
                        type='submit' 
                        className={`w-full ${isConnected ? 'bg-tt-red-500 hover:bg-tt-red-600' : 'bg-tt-blue-500 hover:bg-tt-blue-600'} text-white`}
                        variant={isConnected ? 'destructive' : 'default'}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isConnected ? 'Disconnecting...' : 'Connecting...'}
                            </>
                        ) : (
                            isConnected ? 'Disconnect' : 'Connect'
                        )}
                    </Button>
                </form>
                {isConnected && (
                    <Alert className="mt-4 bg-tt-bg-dark border-tt-status-success">
                        <AlertDescription className="text-tt-text-secondary">
                            Successfully connected to PlayStation at {ip}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

export default ConnectionForm;