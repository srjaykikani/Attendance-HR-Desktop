// renderer/components/ActivityTracker.tsx
import React, { useState, useEffect } from 'react';
import { Table } from './ui/table';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Clock, ChevronDown } from 'lucide-react';
import { ActivityLog, DailyActivity } from '../../main/types';

interface AttendanceRecord {
  date: string;
  grossTime: string;
  effectiveTime: string;
  idleTime: string;
  logs: ActivityLog[];
}

const LoginIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 4L4 20M4 20L4 12M4 20L12 20" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 20L20 4M20 4H12M20 4V12" stroke="#F44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface LogActivityProps {
  logs: ActivityLog[];
}

const LogActivity: React.FC<LogActivityProps> = ({ logs }) => {
  const sortedLogs = [...logs].sort((a, b) => a.logIn - b.logIn);

  return (
    <div className="space-y-2">
      {sortedLogs.map((log, index) => (
        <div key={`log-${index}`} className="flex items-center">
          {log.logIn && (
            <>
              <LoginIcon />
              <span className="ml-2 text-sm">
                Login at {new Date(log.logIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
            </>
          )}
          {log.logOut && (
            <>
              <LogoutIcon />
              <span className="ml-2 text-sm">
                Logout at {new Date(log.logOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

interface LogViewProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord;
}

const LogView: React.FC<LogViewProps> = ({ isOpen, onClose, record }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{record.date}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
        <h4 className="font-semibold mb-2">Activity Log</h4>
        <LogActivity logs={record.logs} />
      </div>
    </div>
  );
};

const TodayStats: React.FC = () => {
  const [currentSession, setCurrentSession] = useState({ grossTime: 0, effectiveTime: 0, idleTime: 0 });
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLogViewOpen, setIsLogViewOpen] = useState(false);

  useEffect(() => {
    const fetchSessionTime = async () => {
      try {
        const sessionTime = await window.ipc.getCurrentSessionTime();
        setCurrentSession(sessionTime);
      } catch (error) {
        console.error('Error fetching current session time:', error);
      }
    };

    fetchSessionTime();
    const interval = setInterval(fetchSessionTime, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchTodayLogs = async () => {
      try {
        const data: Record<string, DailyActivity> = await window.ipc.getActivityData();
        const today = new Date().toISOString().split('T')[0];
        setLogs(data[today]?.logActivity || []);
      } catch (error) {
        console.error('Error fetching today\'s logs:', error);
      }
    };
    fetchTodayLogs();
    const interval = setInterval(fetchTodayLogs, 5000); // Refresh logs every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const formatTime = (milliseconds: number) => {
    if (isNaN(milliseconds) || milliseconds < 0) return '00:00:00';
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Today's Attendance</CardTitle>
        <CardDescription>Real-time tracking of your work session</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Gross Time</p>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-blue-500" />
              <span className="text-xl font-bold">{formatTime(currentSession.grossTime)}</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Effective Time</p>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-green-500" />
              <span className="text-xl font-bold">{formatTime(currentSession.effectiveTime)}</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Idle Time</p>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-red-500" />
              <span className="text-xl font-bold">{formatTime(currentSession.idleTime)}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setIsLogViewOpen(!isLogViewOpen)}>
            View Today's Log
          </Button>
        </div>
      </CardContent>
      {isLogViewOpen && (
        <CardFooter>
          <div className="w-full bg-gray-100 p-4 rounded-lg max-h-60 overflow-y-auto">
            <h4 className="font-semibold mb-2">Today's Log</h4>
            <LogActivity logs={logs} />
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default function ActivityTracker() {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isLogViewOpen, setIsLogViewOpen] = useState(false);

  useEffect(() => {
    fetchAttendanceData();
    const interval = setInterval(fetchAttendanceData, 60000); // Refresh data every minute
    return () => clearInterval(interval);
  }, []);

  const fetchAttendanceData = async () => {
    try {
      const data: Record<string, DailyActivity> = await window.ipc.getActivityData();
      const formattedData: AttendanceRecord[] = Object.entries(data).map(([date, record]) => ({
        date,
        grossTime: formatDuration(record.grossTime),
        effectiveTime: formatDuration(record.effectiveTime),
        idleTime: formatDuration(record.idleTime),
        logs: record.logActivity || [],
      }));
      setAttendanceData(formattedData);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  const formatDuration = (milliseconds: number) => {
    if (isNaN(milliseconds) || milliseconds < 0) return '0h 0m';
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const headers = ['DATE', 'GROSS TIME', 'EFFECTIVE TIME', 'IDLE TIME', 'LOG'];

  const rows = attendanceData.map((record) => [
    <div key={`date-${record.date}`}>
      {record.date}
    </div>,
    record.grossTime,
    <div key={`effective-${record.date}`} className="flex items-center">
      <Clock className="w-4 h-4 mr-2" />
      {record.effectiveTime}
    </div>,
    record.idleTime,
    <div key={`log-${record.date}`} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setSelectedRecord(record);
          setIsLogViewOpen(!isLogViewOpen);
        }}
      >
        View
      </Button>
      {selectedRecord === record && (
        <LogView
          isOpen={isLogViewOpen}
          onClose={() => setIsLogViewOpen(false)}
          record={record}
        />
      )}
    </div>
  ]);

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Attendance Tracker</h2>
      <TodayStats />
      <Table headers={headers} rows={rows} />
    </div>
  );
}