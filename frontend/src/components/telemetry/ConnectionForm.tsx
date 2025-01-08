import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionFormProps {
    onConnect: (ip: string) => void;
    onDisconnect: () => void;
    isConnected: boolean;
}

const ConnectionForm = ({ onConnect, onDisconnect, isConnected }: ConnectionFormProps) => {
    const [ip, setIp] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isConnected) {
            onDisconnect();
        } else {
            onConnect(ip);
        }
    };

    return (
        <Card className='w-full max-w-md mx-auto'>
            <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                    {isConnected ? (
                        <Wifi className='h-5 w-5 text-green-500'/>
                    ) : (
                        <WifiOff className='h-5 w-5 text-red-500' />
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
                            className='w-full'
                            disabled={isConnected}
                        />
                    </div>
                    <Button 
                        type='submit' 
                        className='w-full'
                        variant={isConnected ? 'destructive' : 'default'}
                    >
                        {isConnected ? 'Disconnect' : 'Connect'}
                    </Button>
                </form>
                {isConnected && (
                    <Alert className="mt-4">
                        <AlertDescription>
                            Successfully connected to PlayStation at {ip}
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

export default ConnectionForm;