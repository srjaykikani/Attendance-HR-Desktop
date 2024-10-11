// renderer/components/TimeEntry.tsx
import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import { Alert, AlertDescription } from './ui/alert';
import { Clock } from 'lucide-react';

interface TimeEntryProps {
  userId: string;
  onTimeSubmit?: (duration: number) => void;
}

export default function TimeEntry({ userId, onTimeSubmit }: TimeEntryProps) {
  const [isClockIn, setIsClockIn] = useState(true);
  const [clockInTime, setClockInTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Reset success message after 3 seconds
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleClockAction = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const currentTime = Date.now();

    try {
      if (isClockIn) {
        // Clock In
        setClockInTime(currentTime);
        await logActivity(currentTime, 0);
        setIsClockIn(false);
      } else {
        // Clock Out
        if (clockInTime === null) {
          throw new Error('Clock in time not found');
        }
        const duration = currentTime - clockInTime;
        await logActivity(currentTime, duration);
        setIsClockIn(true);
        setClockInTime(null);
        if (onTimeSubmit) {
          onTimeSubmit(duration);
        }
      }
      setSuccess(true);
    } catch (error) {
      console.error('Error logging time:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while logging the time');
    } finally {
      setIsLoading(false);
    }
  };

  const logActivity = async (timestamp: number, duration: number) => {
    const response = await window.electron.ipcRenderer.invoke('log-activity', {
      userId,
      type: isClockIn ? 'clock-in' : 'clock-out',
      timestamp,
      duration
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to log time');
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 ">
        <Clock className="w-5 h-5 text-gray-500" />
        <Button onClick={handleClockAction} disabled={isLoading} className="flex-grow">
          {isLoading ? 'Processing...' : isClockIn ? 'Clock In' : 'Clock Out'}
        </Button>
      </div>
      
      {clockInTime && !isClockIn && (
        <div className="text-sm text-gray-600">
          Clocked in at: {formatTime(clockInTime)}
        </div>
      )}
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            {isClockIn ? 'Clocked out successfully' : 'Clocked in successfully'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}