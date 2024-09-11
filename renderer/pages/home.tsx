import React, { useState, useEffect } from 'react';
import SignIn from '../components/SignIn';
import Dashboard from '../components/Dashboard';

// Define the User interface based on the structure from your Payload CMS
interface User {
  id: string;
  email: string;
  role: string;
  department?: string;
  manager?: string | { id: string; email: string };
  managerLead?: string | { id: string; email: string };
  salesLead?: string | { id: string; email: string };
  ceo?: string | { id: string; email: string };
}

interface DashboardProps {
  user: User;
  onSignOut: () => Promise<void>;
}

interface ManagerInfo {
  id: string;
  email: string;
}

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const result = await window.ipc.invoke('check-auth');
      setIsAuthenticated(result.isAuthenticated);
      setUser(result.user);
    };
    checkAuth();
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    const result = await window.ipc.invoke('sign-in', { email, password });
    if (result.success) {
      setIsAuthenticated(true);
      setUser(result.user);
    } else {
      console.error(result.error);
    }
  };

  const handleSignOut = async () => {
    await window.ipc.invoke('logout');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (!isAuthenticated) {
    return <SignIn onSignIn={handleSignIn} />;
  }

  return user ? <Dashboard user={user} onSignOut={handleSignOut} /> : null;
}