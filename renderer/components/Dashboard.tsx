// renderer/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Button } from "./ui/button";
import ActivityTracker from './ActivityTracker';
import TimeEntry from './TimeEntry';
import CommentBox from './CommentBox';

interface User {
  id: string;
  email: string;
  role: string;
  department?: string;
  manager?: string | { id: string; email: string };
  managerLead?: string | { id: string; email: string };
  salesLead?: string | { id: string; email: string };
  ceo?: string | { id: string; email: string };
  comment?: string;
}

interface DashboardProps {
  user: User;
  onSignOut: () => Promise<void>;
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const [comment, setComment] = useState(user.comment || '');
  const [isCapturing, setIsCapturing] = useState(true); // Set default to true

  useEffect(() => {
    setComment(user.comment || '');
  }, [user.comment]);

  useEffect(() => {
    // Check screenshot capture status and start if not already running
    const checkAndStartCapture = async () => {
      try {
        const status = await window.screenshot.getCaptureStatus();
        if (!status.isCapturing) {
          console.log('Starting screenshot capture automatically...');
          const result = await window.screenshot.startCapture();
          if (result.success) {
            setIsCapturing(true);
          } else {
            console.error('Failed to start capture:', result.error);
          }
        }
        setIsCapturing(status.isCapturing);
      } catch (error) {
        console.error('Error checking/starting capture:', error);
      }
    };

    checkAndStartCapture();
  }, []);

  const handleScreenshotToggle = async () => {
    try {
      console.log('Toggling screenshot capture...');
      if (isCapturing) {
        await window.screenshot.stopCapture();
        setIsCapturing(false);
        console.log('Screenshot capture stopped');
      } else {
        console.log('Starting screenshot capture...');
        const result = await window.screenshot.startCapture();
        if (result.success) {
          setIsCapturing(true);
          console.log('Screenshot capture started');
        } else {
          console.error('Failed to start capture:', result.error);
          // Add error notification here if you have a notification system
        }
      }
    } catch (error) {
      console.error('Screenshot toggle failed:', error);
      // Add error notification here if you have a notification system
    }
  };

  const handleTestScreenshot = async () => {
    try {
      console.log('Testing screenshot capture...');
      const result = await window.electron.ipcRenderer.invoke('test-screenshot');
      
      if (result.success) {
        console.log('Screenshot test successful:', result);
        alert(`Screenshot captured and uploaded successfully!\nURL: ${result.url}`);
      } else {
        console.error('Screenshot test failed:', result.error);
        alert(`Screenshot test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Screenshot test failed:', error);
      alert('Screenshot test failed. Check console for details.');
    }
  };

  const renderUserInfo = () => {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">User Information</h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.email}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.role}</dd>
            </div>
            {user.department && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Department</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.department}</dd>
              </div>
            )}
            {user.manager && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Manager</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {typeof user.manager === 'string' ? user.manager : user.manager.email}
                </dd>
              </div>
            )}
            {user.managerLead && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Manager Lead</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {typeof user.managerLead === 'string' ? user.managerLead : user.managerLead.email}
                </dd>
              </div>
            )}
            {user.salesLead && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Sales Lead</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {typeof user.salesLead === 'string' ? user.salesLead : user.salesLead.email}
                </dd>
              </div>
            )}
            {user.ceo && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">CEO</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {typeof user.ceo === 'string' ? user.ceo : user.ceo.email}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <img className="h-8 w-auto" src="/images/logo.png" alt="Your Company" />
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-gray-700 mr-4">Welcome, {user.email}</span>
              <Button onClick={onSignOut}>Sign Out</Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">Dashboard</h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              {/* Add this new section before or after ActivityTracker */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Screenshot Capture
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {isCapturing 
                      ? 'Screenshots are being captured every 5 minutes' 
                      : 'Start capturing screenshots'}
                  </p>
                  <div className="mt-4 space-x-4 flex items-center">
                    <Button
                      onClick={handleScreenshotToggle}
                      variant={isCapturing ? "destructive" : "default"}
                    >
                      {isCapturing ? 'Stop Capture' : 'Start Capture'}
                    </Button>
                    <Button
                      onClick={handleTestScreenshot}
                      variant="outline"
                    >
                      Test Screenshot
                    </Button>
                  </div>
                </div>
              </div>

              {renderUserInfo()}
              <div className="mt-8">
                <ActivityTracker />
              </div>
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Manual Time Entry</h2>
                <TimeEntry userId={user.id} />
              </div>
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">User Comments</h2>
                <CommentBox userId={user.id} initialComment={comment} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}