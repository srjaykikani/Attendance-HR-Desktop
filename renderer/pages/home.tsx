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

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await window.ipc.checkAuth();
        setIsAuthenticated(result.isAuthenticated);
        setUser(result.user || null);
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    try {
      const result = await window.ipc.signIn({ email, password });
      if (result.success) {
        setIsAuthenticated(true);
        setUser(result.user);
      } else {
        console.error(result.error);
        // You might want to show an error message to the user here
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleSignOut = async () => {
    try {
      await window.ipc.logout();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      // You might want to show an error message to the user here
    }
  };

  if (!isAuthenticated) {
    return <SignIn onSignIn={handleSignIn} />;
  }

  return user ? <Dashboard user={user} onSignOut={handleSignOut} /> : null;
}