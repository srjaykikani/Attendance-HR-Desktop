import React, { useState, useEffect } from 'react';
import SignIn from '../components/SignIn';

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await window.ipc.invoke('get-token');
      setIsAuthenticated(!!token);
    };
    checkAuth();
  }, []);

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Welcome to PAR Solution Attendance Tracker</h1>
      <p>You are signed in. Implement your main app content here.</p>
    </div>
  );
}